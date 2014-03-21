/**
 * XBlockEditorView displays the authoring view of an xblock, and allows the user to switch between
 * the available modes.
 */
define(["jquery", "underscore", "gettext", "js/views/feedback_notification", "js/views/xblock",
    "js/views/metadata", "js/collections/metadata", "jquery.inputnumber"],
    function ($, _, gettext, NotificationView, XBlockView, MetadataView, MetadataCollection) {

        var XBlockEditorView = XBlockView.extend({
            // takes XBlockInfo as a model

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
                var metadataEditor,
                    defaultMode = 'editor';
                metadataEditor = this.createMetadataEditor();
                this.metadataEditor = metadataEditor;
                if (this.getDataEditor()) {
                    defaultMode = 'editor';
                } else if (metadataEditor) {
                    defaultMode = 'settings';
                }
                this.selectMode(defaultMode);
            },

            createMetadataEditor: function() {
                var metadataEditor,
                    metadataData,
                    models = [],
                    key,
                    xblock = this.xblock,
                    metadataView = null;
                metadataEditor = this.$('.metadata_edit');
                if (metadataEditor.length === 1) {
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
                return this.metadataEditor;
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
                    metadataView = this.metadataEditor,
                    metadata,
                    data;
                data = xblock.save();
                metadata = data.metadata;
                if (metadataView) {
                    metadata = _.extend(metadata || {}, this.getChangedMetadata());
                }
                data.metadata = metadata;
                return data;
            },

            /**
             * Returns the metadata that has changed in the editor. This is a combination of the metadata
             * modified in the "Settings" editor, as well as any custom metadata provided by the component.
             */
            getChangedMetadata: function() {
                var metadataEditor = this.metadataEditor;
                return _.extend(metadataEditor.getModifiedMetadataValues(), this.getCustomMetadata());
            },

            /**
             * Returns custom metadata defined by a particular xmodule that aren't part of the metadata editor.
             * In particular, this is used for LaTeX high level source.
             */
            getCustomMetadata: function() {
                // Walk through the set of elements which have the 'data-metadata_name' attribute and
                // build up an object to pass back to the server on the subsequent POST.
                // Note that these values will always be sent back on POST, even if they did not actually change.
                var metadata = {},
                    metadataNameElements;
                metadataNameElements = this.$('[data-metadata-name]');
                metadataNameElements.each(function (element) {
                    var key = $(element).data("metadata-name"),
                        value = element.value;
                    metadata[key] = value;
                });
                return metadata;
            },

            getMode: function() {
                return this.mode;
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
                this.mode = mode;
            }
        });

        return XBlockEditorView;
    }); // end define();
