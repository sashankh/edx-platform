"""
This file contains view functions for wrapping the django-wiki.
"""
import logging
import re
import cgi
from urlparse import urlparse

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.exceptions import ImproperlyConfigured, PermissionDenied
from django.shortcuts import redirect
from django.conf.urls import url
from django.http import Http404
from django.utils.translation import ugettext as _

from wiki.core.exceptions import NoRootURL
from wiki.models import URLPath, Article
from wiki.urls import get_pattern as wiki_pattern
from wiki.models import reverse as wiki_reverse

from courseware.courses import get_course_by_id, get_course_with_access
from courseware.access import has_access
from student.models import CourseEnrollment
from course_wiki.utils import course_wiki_slug

log = logging.getLogger(__name__)

WIKI_URL = url('', wiki_pattern())


def _url_from_referrer(user, referer, wiki_path):
    """
    return course wiki url if the referrer is from a course page
    """
    if referer:
        referer_path = urlparse(referer).path
        # We are going to the wiki. Check if we came from a course
        course_match = re.match(r'/courses/(?P<course_id>[^/]+/[^/]+/[^/]+)/.*', referer_path)
        if course_match:
            course_id = course_match.group('course_id')

            # See if we are able to view the course. If we are, redirect to it
            try:
                course = get_course_with_access(user, course_id, 'load')
                return "/courses/{course_id}/wiki/{path}".format(course_id=course.id, path=wiki_path)
            except Http404:
                # Even though we came from the course, we can't see it. So don't worry about it.
                pass


def proxy_view(request, course_id=None, wiki_path=None):
    """
    This wraps the django-wiki endpoints in order to authenticate the user
    and modify the paths when the course wiki is requested.
    """
    destination = request.path
    _transform_url = None

    if course_id is None:
        # this is a request for /wiki/...

        # Check to see if we don't allow top-level access to the wiki via the /wiki/xxxx/yyy/zzz URLs
        # this will help prevent people from writing pell-mell to the Wiki in an unstructured way
        if not settings.FEATURES.get('ALLOW_WIKI_ROOT_ACCESS', False):
            raise PermissionDenied()

        referer = request.META.get('HTTP_REFERER')
        destination = _url_from_referrer(request.user, referer, wiki_path)
        if destination:
            return redirect(destination)
    else:
        # this is a /course/123/wiki request
        my_url = request.path.replace(wiki_path, '').replace('/wiki/', '')
        _transform_url = lambda url: my_url + url

        # Authorization Check
        # Let's see if user is enrolled or the course allows for public access
        try:
            course = get_course_with_access(request.user, course_id, 'load')
        except Http404:
            # course does not exist. redirect to root wiki
            return redirect('/wiki/{}'.format(wiki_path))

        if not course.allow_public_wiki_access:
            is_enrolled = CourseEnrollment.is_enrolled(request.user, course.id)
            is_staff = has_access(request.user, course, 'staff')
            if not (is_enrolled or is_staff):
                raise PermissionDenied()

    function, new_args, new_kwargs = WIKI_URL.resolve(wiki_path)
    # _transform_url is a hack in django-wiki for modifying all urls
    # in the namespace. we want to replace /wiki/123 with /course/foo/bar/wiki/123
    if _transform_url:
        wiki_reverse._transform_url = lambda url: url  # pylint: disable=W0212
    try:
        return function(request, *new_args, **new_kwargs)
    finally:
        # make sure to clean up the hack, or else subsequent requests will
        # be incorrectly transformed
        if _transform_url:
            del wiki_reverse._transform_url


def root_create(request):  # pylint: disable=W0613
    """
    In the edX wiki, we don't show the root_create view. Instead, we
    just create the root automatically if it doesn't exist.
    """
    root = get_or_create_root()
    return redirect('wiki:get', path=root.path)


def course_wiki_redirect(request, course_id):
    """
    This redirects to whatever page on the wiki that the course designates
    as it's home page. A course's wiki must be an article on the root (for
    example, "/6.002x") to keep things simple.
    """
    course = get_course_by_id(course_id)
    course_slug = course_wiki_slug(course)

    valid_slug = True
    if not course_slug:
        log.exception("This course is improperly configured. The slug cannot be empty.")
        valid_slug = False
    if re.match(r'^[-\w\.]+$', course_slug) is None:
        log.exception("This course is improperly configured. The slug can only contain letters, numbers, periods or hyphens.")
        valid_slug = False

    if not valid_slug:
        return _modify_redirect(request, redirect("wiki:get", path=""))

    # The wiki needs a Site object created. We make sure it exists here
    try:
        Site.objects.get_current()
    except Site.DoesNotExist:
        new_site = Site()
        new_site.domain = settings.SITE_NAME
        new_site.name = "edX"
        new_site.save()
        if str(new_site.id) != str(settings.SITE_ID):
            raise ImproperlyConfigured("No site object was created and the SITE_ID doesn't match the newly created one. " + str(new_site.id) + "!=" + str(settings.SITE_ID))

    try:
        urlpath = URLPath.get_by_path(course_slug, select_related=True)

        results = list(Article.objects.filter(id=urlpath.article.id))
        if results:
            article = results[0]
        else:
            article = None

    except (NoRootURL, URLPath.DoesNotExist):
        # We will create it in the next block
        urlpath = None
        article = None

    if not article:
        # create it
        root = get_or_create_root()

        if urlpath:
            # Somehow we got a urlpath without an article. Just delete it and
            # recerate it.
            urlpath.delete()

        content = cgi.escape(
            # Translators: this string includes wiki markup.  Leave the ** and the _ alone.
            _("This is the wiki for **{organization}**'s _{course_name}_.").format(
                organization=course.display_org_with_default,
                course_name=course.display_name_with_default,
            )
        )
        urlpath = URLPath.create_article(
            root,
            course_slug,
            title=course_slug,
            content=content,
            user_message=_("Course page automatically created."),
            user=None,
            ip_address=None,
            article_kwargs={'owner': None,
                            'group': None,
                            'group_read': True,
                            'group_write': True,
                            'other_read': True,
                            'other_write': True,
                            })

    return _modify_redirect(request, redirect("wiki:get", path=urlpath.path))


def _modify_redirect(request, response):
    """
    Modify the redirect from /wiki/123 to /course/foo/bar/wiki/123/
    if the referrer comes from a course page
    """
    referer = request.META.get('HTTP_REFERER')
    destination_url = response['Location']
    destination = urlparse(destination_url).path.split('/wiki/', 1)[1]

    new_destination = _url_from_referrer(request.user, referer, destination)

    if new_destination:
        response['Location'] = new_destination

    return response


def get_or_create_root():
    """
    Returns the root article, or creates it if it doesn't exist.
    """
    try:
        root = URLPath.root()
        if not root.article:
            root.delete()
            raise NoRootURL
        return root
    except NoRootURL:
        pass

    starting_content = "\n".join((
        _("Welcome to the edX Wiki"),
        "===",
        _("Visit a course wiki to add an article."),
    ))

    root = URLPath.create_root(title=_("Wiki"), content=starting_content)
    article = root.article
    article.group = None
    article.group_read = True
    article.group_write = False
    article.other_read = True
    article.other_write = False
    article.save()

    return root
