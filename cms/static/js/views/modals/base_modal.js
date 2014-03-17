/**
 * This is a base modal implementation that provides common utilities.
 */
define(["jquery", "underscore", "underscore.string", "gettext", "js/views/baseview"],
    function($, _, str, gettext, BaseView) {
        var BaseModal = BaseView.extend({
            options: $.extend({}, BaseView.prototype.options, {
                type: "prompt",
                closeIcon: false,
                icon: false
            })
        });

        return BaseModal;
    });
