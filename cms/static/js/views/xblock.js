define(["jquery", "underscore", "js/views/baseview", "xblock/runtime.v1"],
    function ($, _, BaseView, XBlock) {

        var XBlockView = BaseView.extend({
            // takes XBlockInfo as a model

            initialize: function() {
                BaseView.prototype.initialize.call(this);
                this.view = this.options.view;
            },

            render: function(options) {
                var self = this,
                    view = this.view,
                    xblockInfo = this.model,
                    xblockUrl = xblockInfo.url();
                return $.ajax({
                    url: decodeURIComponent(xblockUrl) + "/" + view,
                    type: 'GET',
                    headers: { Accept: 'application/json' },
                    success: function(fragment) {
                        self.handleXBlockFragment(fragment, options);
                    }
                });
            },

            handleXBlockFragment: function(fragment, options) {
                var wrapper = this.$el,
                    xblockElement,
                    success = options ? options.success : null,
                    xblock;
                this.renderXBlockFragment(fragment, wrapper);
                xblockElement = this.$('.xblock').first();
                xblock = XBlock.initializeBlock(xblockElement);
                this.xblock = xblock;
                this.xblockReady(xblock);
                if (success) {
                    success(xblock);
                }
            },

            /**
             * This method is called upon successful rendering of an xblock.
             */
            xblockReady: function(xblock) {
                // Do nothing
            },

            /**
             * Returns true if the specified xblock has children.
             */
            hasChildXBlocks: function() {
                return this.$('.edit-button').length > 1;
            },

            /**
             * Renders an xblock fragment into the specifed element. The fragment has two attributes:
             *   html: the HTML to be rendered
             *   resources: any JavaScript or CSS resources that the HTML depends upon
             * @param fragment The fragment returned from the xblock_handler
             * @param element The element into which to render the fragment (defaults to this.$el)
             */
            renderXBlockFragment: function(fragment, element) {
                var applyResource, i, len, resources, resource;
                if (!element) {
                    element = this.$el;
                }

                applyResource = function(value) {
                    var hash, resource, head;
                    hash = value[0];
                    if (!window.loadedXBlockResources) {
                        window.loadedXBlockResources = [];
                    }
                    if (_.indexOf(window.loadedXBlockResources, hash) < 0) {
                        resource = value[1];
                        head = $('head');
                        if (resource.mimetype === "text/css") {
                            if (resource.kind === "text") {
                                head.append("<style type='text/css'>" + resource.data + "</style>");
                            } else if (resource.kind === "url") {
                                head.append("<link rel='stylesheet' href='" + resource.data + "' type='text/css'>");
                            }
                        } else if (resource.mimetype === "application/javascript") {
                            if (resource.kind === "text") {
                                head.append("<script>" + resource.data + "</script>");
                            } else if (resource.kind === "url") {
                                $.getScript(resource.data);
                            }
                        } else if (resource.mimetype === "text/html") {
                            if (resource.placement === "head") {
                                head.append(resource.data);
                            }
                        }
                        window.loadedXBlockResources.push(hash);
                    }
                };

                element.html(fragment.html);
                resources = fragment.resources;
                for (i = 0, len = resources.length; i < len; i++) {
                    resource = resources[i];
                    applyResource(resource);
                }
                return this.delegateEvents();
            }
        });

        return XBlockView;
    }); // end define();
