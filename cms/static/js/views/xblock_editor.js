define(["jquery", "underscore", "gettext", "js/views/feedback_notification", "js/views/xblock",
    "js/views/metadata", "js/collections/metadata"],
    function ($, _, gettext, NotificationView, XBlockView, MetadataView, MetadataCollection) {

        var XBlockEditorView = XBlockView.extend({
            // takes XBlockInfo as a model

            mode: 'editor-mode',

            options: $.extend({}, XBlockView.prototype.options, {
                view: 'studio_view'
            }),

            initialize: function() {
                XBlockView.prototype.initialize.call(this);
                this.view = this.options.view;
            },

            xblockReady: function(xblock) {
                XBlockView.prototype.xblockReady.call(this, xblock);
                this.initializeEditors();
            },

            initializeEditors: function() {
                var metadataView,
                    defaultMode = null;
                metadataView = this.createMetadataView();
                this.metadataView = metadataView;
                if (this.getDataEditor()) {
                    defaultMode = 'editor';
                } else if (metadataView) {
                    defaultMode = 'settings';
                }
                if (defaultMode) {
                    this.selectMode(defaultMode);
                } else {
                    console.error("Failed to find any editor tabs");
                }
            },

            createMetadataView: function() {
                var metadataEditor,
                    metadataData,
                    models = [],
                    key,
                    xblock = this.xblock,
                    metadataView = null;
                metadataEditor = this.getMetadataEditor();
                if (metadataEditor) {
                    metadataData = metadataEditor.data('metadata');
                    for (key in metadataData) {
                        if (metadataData.hasOwnProperty(key)) {
                            models.push(metadataData[key]);
                        }
                    }
                    metadataView = new MetadataView.Editor({
                        el: metadataEditor,
                        collection: new MetadataCollection(models)
                    });
                    if (xblock.setMetadataEditor) {
                        xblock.setMetadataEditor(metadataView);
                    }
                }
                return metadataView;
            },

            getDataEditor: function() {
                var editor = this.$('.wrapper-comp-editor');
                return editor.length === 1 ? editor : null;
            },

            getMetadataEditor: function() {
                var editor = this.$('.metadata_edit');
                return editor.length === 1 ? editor : null;
            },

            save: function(options) {
                var xblock = this.xblock,
                    xblockInfo = this.model,
                    data,
                    saving;
                data = this.getXBlockData();
                analytics.track("Saved Module", {
                    course: course_location_analytics,
                    id: xblock.id
                });
                saving = new NotificationView.Mini({
                    title: gettext('Saving&hellip;')
                });
                saving.show();
                return xblockInfo.save(data).done(function() {
                    var success = options.success;
                    saving.hide();
                    if (success) {
                        success();
                    }
                });
            },

            getXBlockData: function() {
                var xblock = this.xblock,
                    metadataView = this.metadataView,
                    metadata,
                    data;
                data = xblock.save();
                metadata = data.metadata;
                if (metadataView) {
                    metadata = _.extend(metadata || {}, metadataView.getModifiedMetadataValues());
                }
                data.metadata = metadata;
                return data;
            },

            selectMode: function(mode) {
                var showEditor = mode === 'editor',
                    dataEditor,
                    settingsEditor;
                dataEditor = this.$('.wrapper-comp-editor');
                settingsEditor = this.$('.wrapper-comp-settings');
                if (showEditor) {
                    dataEditor.removeClass('is-inactive');
                    settingsEditor.removeClass('is-active');
                } else {
                    dataEditor.addClass('is-inactive');
                    settingsEditor.addClass('is-active');
                }
            }
        });

        return XBlockEditorView;
    }); // end define();
