"""
This file contains template tags used for the django-wiki project.
"""
import re
from django import template
from django.http import Http404

from courseware.access import has_access
from courseware.courses import get_course_with_access

register = template.Library()  # pylint: disable=C0103


@register.simple_tag(takes_context=True)
def load_course(context):
    """
    This is a context processor which looks at the URL while we are
    in the wiki. If the url is in the form
    /courses/(course_id)/wiki/...
    then we add 'course' to the context. This allows the course nav
    bar to be shown.
    """
    request = context['request']
    match = re.match(r'/courses/(?P<course_id>[^/]+/[^/]+/[^/]+)/wiki/(?P<wiki_path>.*|)$', request.path)
    if match:
        course_id = match.group('course_id')

        try:
            course = get_course_with_access(request.user, course_id, 'load')
            staff_access = has_access(request.user, course, 'staff')
            context['course'] = course
            context['staff_access'] = staff_access
        except Http404:
            # We couldn't access the course for whatever reason.
            pass
    return ''
