// @flow

import m from "mithril"
import {KnowledgeBaseModel} from "../model/KnowledgeBaseModel"
import {Editor} from "../../gui/editor/Editor"
import {KnowledgeBaseView} from "./KnowledgeBaseView"
import {showTemplatePopupInEditor} from "../../templates/view/TemplatePopup"
import {Dialog, DialogType} from "../../gui/base/Dialog"
import type {TemplateModel} from "../../templates/model/TemplateModel"

// TODO template model should be optional
export function showKnowledgeBaseDialog(knowledgeBase: KnowledgeBaseModel, templateModel: TemplateModel, editor: Editor) {
	let dialog
	const resizeListener = () => dialog.close()

	const knowledgebaseComponent = {
		view: () => {
			return m(KnowledgeBaseView, {
				onTemplateSelect: (template) => {
					showTemplatePopupInEditor(templateModel, editor, template, "")
				},
				model: knowledgeBase,
				parentDialog: dialog
			})
		}
	}

	// TODO this displays all effed up now
	// maybe just do modal something something
	dialog = new Dialog(DialogType.EditLarge, knowledgebaseComponent)

	dialog.show()

}