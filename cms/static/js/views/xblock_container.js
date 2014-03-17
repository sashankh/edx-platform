define(["jquery", "underscore", "js/views/baseview", "js/views/xblock", "js/views/modals/edit_xblock"],
    function ($, _, BaseView, XBlockView, EditXBlockModal) {

        var XBlockContainerView = BaseView.extend({
            // takes XBlockInfo as a model

            view: 'container_preview',

            initialize: function() {
                BaseView.prototype.initialize.call(this);
                this.noContentElement = this.$('.no-container-content');
                this.xblockView = new XBlockView({
                    el: this.$('.wrapper-xblock'),
                    model: this.model,
                    view: this.view
                });
            },

            render: function(options) {
                var self = this,
                    noContentElement = this.noContentElement,
                    xblockView = this.xblockView;
                noContentElement.addClass('is-hidden');
                xblockView.$el.addClass('is-hidden');
                xblockView.render({
                    success: function(xblock) {
                        if (xblockView.hasChildXBlocks()) {
                            xblockView.$el.removeClass('is-hidden');
                            self.addButtonActions(xblockView.$el);
                        } else {
                            noContentElement.removeClass('is-hidden');
                        }
                    }
                });
            },

            findXBlockElement: function(target) {
                return $(target).closest('[data-locator]');
            },

            addButtonActions: function(element) {
                var self = this;
                element.find('.edit-button').click(function(event) {
                    var modal,
                        target = event.target,
                        xblockElement = self.findXBlockElement(target);
                    event.preventDefault();
                    modal = new EditXBlockModal({
                        el: $('.edit-xblock-modal'),
                        view: self.view
                    });
                    modal.edit(xblockElement, self.model,
                        {
                            success: function(element) {
                                self.addButtonActions(element);
                            }
                        });
                });
            }
        });

        return XBlockContainerView;
    }); // end define();
