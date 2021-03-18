// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import stream from "mithril/stream/stream.js"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {ButtonColors, ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {Icons} from "../gui/base/icons/Icons"
import {KnowledgeBaseEditorModel} from "./KnowledgeBaseEditorModel"
import {noOp} from "../api/common/utils/Utils"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {Dialog} from "../gui/base/Dialog"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import {lang} from "../misc/LanguageViewModel"
import type {KeyPress} from "../misc/KeyManager"
import {Keys} from "../api/common/TutanotaConstants"
import {Icon} from "../gui/base/Icon"
import {locator} from "../api/main/MainLocator"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {attachDropdown} from "../gui/base/DropdownN"
import {showUserError} from "../misc/ErrorHandlerImpl"
import {elementIdPart, listIdPart} from "../api/common/utils/EntityUtils"
import {HtmlEditor} from "../gui/editor/HtmlEditor"
import {UserError} from "../api/main/UserError"
import type {DropDownChildAttrs} from "../gui/base/DropdownN"
import {TEMPLATE_SHORTCUT_PREFIX} from "../templates/model/TemplateModel"

/**
 *  Editor to edit / add a knowledgeBase entry
 */
export function showKnowledgeBaseEditor(entry: ?KnowledgeBaseEntry, templateGroupRoot: TemplateGroupRoot): void {
	const entityClient = locator.entityClient
	const editorModel = new KnowledgeBaseEditorModel(entry, templateGroupRoot, entityClient)

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

	const headerBarAttrs: DialogHeaderBarAttrs = {
		left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
		right: [{label: 'save_action', click: saveAction, type: ButtonType.Primary}],
		middle: () => lang.get(editorModel.entry._id ? "editEntry_label" : "createEntry_action")
	}
	const dialog = Dialog.largeDialogN(headerBarAttrs, KnowledgeBaseEditor, editorModel)
	dialog.show()
}

class KnowledgeBaseEditor implements MComponent<KnowledgeBaseEditorModel> {
	_selectedTemplate: Stream<?EmailTemplate>
	_entryContentEditor: HtmlEditor
	_enterTitleAttrs: TextFieldAttrs
	_enterKeywordAttrs: TextFieldAttrs
	_linkedTemplateButtonAttrs: ButtonAttrs

	constructor(vnode: Vnode<KnowledgeBaseEditorModel>) {
		const model = vnode.attrs
		this._enterTitleAttrs = {
			label: "title_label",
			value: model.title
		}
		const keywordInput = stream("")
		this._enterKeywordAttrs = {
			label: "keywords_label",
			value: keywordInput,
			keyHandler: (key: KeyPress) => {
				if (key.keyCode === Keys.RETURN.code) {
					model.addKeyword(keywordInput())
					keywordInput("")
					return false
				}
				return true
			}
		}

		this._linkedTemplateButtonAttrs = attachDropdown({
			label: () => lang.get("linkTemplate_label") + ' ▼',
			title: "linkTemplate_label",
			type: ButtonType.Toggle,
			click: noOp,
			noBubble: true,
			colors: ButtonColors.Elevated,
		}, () => this._createDropdownChildAttrs(model))

		this._entryContentEditor = new HtmlEditor("content_label", {
			enabled: true,
			customButtonAttrs: [this._linkedTemplateButtonAttrs]
		}).showBorders()
		  .setMinHeight(500)

		model.setDescriptionProvider(() => {
			return this._entryContentEditor.getValue()
		})

		if (model.isUpdate()) { // if existing entry
			// init existing keywords, steps and title
			this._enterTitleAttrs.value(model.entry.title)
			this._entryContentEditor.setValue(model.entry.description)
		}
	}

	_createDropdownChildAttrs(model: KnowledgeBaseEditorModel): Promise<Array<DropDownChildAttrs>> {
		return model.availableTemplates.getAsync().then(templates => {
			if (templates.length > 0) {
				return templates.map(template => {
					return {
						label: () => template.tag,
						type: ButtonType.Dropdown,
						click: () => {
							const templateLink = `<a href="tutatemplate:${listIdPart(template._id)}/${elementIdPart(template._id)}" >${TEMPLATE_SHORTCUT_PREFIX
							+ template.tag}</a> `
							this._entryContentEditor._editor.insertHTML(templateLink)
						}
					}
				})
			} else {
				return [
					{
						label: "noEntries_msg",
						type: ButtonType.Dropdown,
						click: noOp
					}
				]
			}
		})
	}

	view(vnode: Vnode<KnowledgeBaseEditorModel>): Children {
		const model = vnode.attrs
		return m("", [
			m(TextFieldN, this._enterTitleAttrs),
			m(TextFieldN, this._enterKeywordAttrs),
			m(".flex.wrap.mt-s", [
				model.entry.keywords.map(keyword => {
					return m(".flex.flex-row.bubbleTag.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", [
						m(".text-ellipsis", keyword.keyword),
						m(".flex.click.center-vertically", {onclick: () => model.removeKeyword(keyword)},
							m(Icon, {
								icon: Icons.Cancel,
							})
						)
					])
				})
			]),
			m(this._entryContentEditor),
		])
	}
}