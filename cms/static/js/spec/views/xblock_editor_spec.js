define([ "jquery", "js/spec/create_sinon", "URI", "js/views/xblock_editor", "js/models/xblock_info",
    "xmodule", "coffee/src/main", "xblock/cms.runtime.v1"],
    function ($, create_sinon, URI, XBlockEditorView, XBlockInfo) {

        describe("XBlockEditorView", function() {
            var model, editor, respondWithMockXBlockEditorFragment;

            beforeEach(function () {
                model = new XBlockInfo({
                    id: 'testCourse/branch/published/block/verticalFFF',
                    display_name: 'Test Unit',
                    category: 'vertical'
                });
                editor = new XBlockEditorView({
                    model: model
                });
            });

            respondWithMockXBlockEditorFragment = function(requests, response) {
                var requestIndex = requests.length - 1;
                create_sinon.respondWithJson(requests, response, requestIndex);
            };

            describe("Editing an xblock", function() {
                var mockXBlockEditorHtml;

                beforeEach(function () {
                    window.MockXBlock = function(runtime, element) {
                        return { };
                    };
                });

                afterEach(function() {
                    window.MockXBlock = null;
                });

                mockXBlockEditorHtml = readFixtures('mock/mock-xblock-editor.underscore');

                it('can render itself', function() {
                    var requests = create_sinon.requests(this);
                    editor.render();
                    respondWithMockXBlockEditorFragment(requests, {
                        html: mockXBlockEditorHtml,
                        "resources": []
                    });

                    expect(editor.$el.select('.xblock-header')).toBeTruthy();
                    expect(editor.getMode()).toEqual('editor');
                });
            });

            describe("Editing an xmodule", function() {
                var mockXModuleEditorHtml, editorTemplate, stringEntryTemplate, numberEntryTemplate, feedbackTemplate;

                mockXModuleEditorHtml = readFixtures('mock/mock-xmodule-editor.underscore');
                editorTemplate = readFixtures('metadata-editor.underscore');
                numberEntryTemplate = readFixtures('metadata-number-entry.underscore');
                stringEntryTemplate = readFixtures('metadata-string-entry.underscore');
                feedbackTemplate = readFixtures('system-feedback.underscore');

                beforeEach(function() {
                    setFixtures($("<script>", {id: "metadata-editor-tpl", type: "text/template"}).text(editorTemplate));
                    appendSetFixtures($("<script>", {id: "metadata-number-entry", type: "text/template"}).text(numberEntryTemplate));
                    appendSetFixtures($("<script>", {id: "metadata-string-entry", type: "text/template"}).text(stringEntryTemplate));
                    appendSetFixtures($("<script>", { id: "system-feedback-tpl", type: "text/template" }).text(feedbackTemplate));

                    // Mock the VerticalDescriptor so that the module can be rendered
                    window.VerticalDescriptor = XModule.Descriptor;
                });

                afterEach(function () {
                    window.VerticalDescriptor = null;
                });

                it('can render itself', function() {
                    var requests = create_sinon.requests(this);
                    editor.render();
                    respondWithMockXBlockEditorFragment(requests, {
                        html: mockXModuleEditorHtml,
                        "resources": []
                    });

                    expect(editor.$el.select('.xblock-header')).toBeTruthy();
                    expect(editor.getMode()).toEqual('settings');
                });
            });
        });
    });
