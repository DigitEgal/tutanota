// @flow

import m from "mithril"
import stream from "mithril/stream/stream.js"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import {Icons} from "../gui/base/icons/Icons"
import {createDropdown} from "../gui/base/DropdownN"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {lang} from "../misc/LanguageViewModel"
import type {LanguageCode} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {getLanguageCode, getLanguageName, TemplateEditorModel} from "./TemplateEditorModel"
import {locator} from "../api/main/MainLocator"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {showUserError} from "../misc/ErrorHandlerImpl"
import {UserError} from "../api/main/UserError"
import {HtmlEditor} from "../gui/editor/HtmlEditor"
import {Keys} from "../api/common/TutanotaConstants"

/**
 *	Creates an Editor Popup in which you can create a new template or edit an existing one
 */

export function showTemplateEditor(template: ?EmailTemplate, templateGroupRoot: TemplateGroupRoot): void {
	const entityClient = locator.entityClient
	const editorModel = new TemplateEditorModel(template, templateGroupRoot, entityClient)

	const dialogCloseAction = () => {
		dialog.close()
	}

	const saveAction = () => {
		editorModel.save()
		           .then(() => {
			           dialog.close()
		           })
		           .catch(UserError, showUserError)
	}

	let headerBarAttrs: DialogHeaderBarAttrs = {
		left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
		right: [{label: 'save_action', click: saveAction, type: ButtonType.Primary}],
		middle: () => lang.get(editorModel.template._id ? "editTemplate_action" : "createTemplate_action")
	}

	const dialog = Dialog.largeDialogN(headerBarAttrs, TemplateEditor, {model: editorModel})
	dialog.show()
}

type TemplateEditorAttrs = {
	model: TemplateEditorModel
}


class TemplateEditor implements MComponent<TemplateEditorAttrs> {
	_templateContentEditor: HtmlEditor

	_enterTitleAttrs: TextFieldAttrs
	_enterTagAttrs: TextFieldAttrs
	_chooseLanguageAttrs: TextFieldAttrs

	constructor(vnode: Vnode<TemplateEditorAttrs>) {
		const model = vnode.attrs.model

		this._templateContentEditor = new HtmlEditor("content_label", {enabled: true})
			.showBorders()
			.setMinHeight(500)

		model.setContentProvider(() => {
			return this._templateContentEditor.getValue()
		})

		// init all input fields
		model.title(model.template.title)
		model.tag(model.template.tag)
		const content = model.selectedContent()
		if (content) {
			this._templateContentEditor.setValue(content.text)
		}

		// Initialize Attributes for TextFields and Buttons
		this._enterTitleAttrs = {
			label: "title_label",
			value: model.title
		}

		this._enterTagAttrs = {
			label: "shortcut_label",
			value: model.tag
		}

		this._chooseLanguageAttrs = {
			label: "language_label",
			value: model.selectedContent.map((content) => content ? getLanguageName(content) : ""),
			injectionsRight: () => [
				model.getAddedLanguages().length > 1 ? m(ButtonN, removeButtonAttrs) : null,
				m(ButtonN, languageButtonAttrs)
			],
			disabled: true
		}

		const languageButtonAttrs: ButtonAttrs = {
			label: "languages_label",
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				// save current content with language & create a dropdwon with all added languages & an option to add a new language
				model.updateContent()
				let additionalLanguages = model.getAdditionalLanguages()
				let buttons = model.template.contents.map(content => {
					return {
						label: () => getLanguageName(content),
						click: () => {
							model.selectedContent(content)
							this._templateContentEditor.setValue(content.text)
						},
						type: ButtonType.Dropdown
					}
				})
				buttons.push({
					label: "addLanguage_action",
					click: () => {
						let newLanguageCode: Stream<LanguageCode> = stream(additionalLanguages[0].value)
						let dropDownSelector = new DropDownSelector("addLanguage_action", null, additionalLanguages, newLanguageCode, 250) // dropdown with all additional languages
						let addLanguageOkAction = (dialog) => {
							const newContent = model.createContent(newLanguageCode())
							if (newContent) {
								model.selectedContent(newContent)
							}
							this._templateContentEditor.setValue("")
							dialog.close()
						}
						Dialog.showActionDialog({
							title: lang.get("addLanguage_action"),
							child: {view: () => m(dropDownSelector)},
							allowOkWithReturn: true,
							okAction: addLanguageOkAction
						})
					},
					type: ButtonType.Dropdown
				})
				return buttons
			})
		}

		const removeButtonAttrs: ButtonAttrs = {
			label: "removeLanguage_action",
			icon: () => Icons.Trash,
			Type: ButtonType.Action,
			click: () => {
				return Dialog.confirm(() => lang.get("deleteLanguageConfirmation_msg", {"{language}": (getLanguageName(model.selectedContent()))})).then((confirmed) => {
					if (confirmed) {
						model.removeContent()
						model.selectedContent(model.template.contents[0])
						this._templateContentEditor.setValue(model.selectedContent().text)
					}
					return confirmed
				})
			}
		}
	}

	view(): Children {
		return m("", [
			m(TextFieldN, this._enterTitleAttrs),
			m(TextFieldN, this._enterTagAttrs),
			m(TextFieldN, this._chooseLanguageAttrs),
			m(this._templateContentEditor)
		])
	}
}