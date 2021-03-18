// @flow

import m from "mithril"
import {KnowledgeBaseModel} from "../model/KnowledgeBaseModel"
import {Editor} from "../../gui/editor/Editor"
import {KnowledgeBaseView} from "./KnowledgeBaseView"
import {showTemplatePopupInEditor} from "../../templates/view/TemplatePopup"
import {Dialog, DialogType} from "../../gui/base/Dialog"

export function showKnowledgeBaseDialog(knowledgeBase: KnowledgeBaseModel, editor: Editor) {
	let dialog
	const resizeListener = () => dialog.close()

	const knowledgebaseComponent = {
		view: () => {
			return m(KnowledgeBaseView, {
				onTemplateSelect: (template) => {
					showTemplatePopupInEditor(editor, template, "")
				},
				model: knowledgeBase,
				parentDialog: dialog
			})
		}
	}

	// TODO this displays all effed up now
	// maybe just modal something something
	dialog = new Dialog(DialogType.EditLarge, knowledgebaseComponent)

	dialog.show()

}