// @flow
import m from "mithril"
import {px} from "../../gui/size"
import {KnowledgeBaseModel} from "../model/KnowledgeBaseModel"
import type {KnowledgeBaseEntry} from "../../api/entities/tutanota/KnowledgeBaseEntry"
import {KNOWLEDGEBASE_LIST_ENTRY_HEIGHT, KnowledgeBaseListEntry} from "./KnowledgeBaseListEntry"
import {lang} from "../../misc/LanguageViewModel"
import type {ButtonAttrs} from "../../gui/base/ButtonN"
import {ButtonType} from "../../gui/base/ButtonN"
import stream from "mithril/stream/stream.js"
import {KnowledgeBaseEntryView} from "./KnowledgeBaseEntryView"
import {locator} from "../../api/main/MainLocator"
import {lastThrow} from "../../api/common/utils/ArrayUtils"
import type {EmailTemplate} from "../../api/entities/tutanota/EmailTemplate"
import {neverNull, noOp} from "../../api/common/utils/Utils"
import {DialogHeaderBar} from "../../gui/base/DialogHeaderBar"
import {TemplateGroupRootTypeRef} from "../../api/entities/tutanota/TemplateGroupRoot"
import {attachDropdown} from "../../gui/base/DropdownN"
import {NotFoundError} from "../../api/common/error/RestError"
import {Dialog} from "../../gui/base/Dialog"
import {TemplateSearchBar} from "../../templates/view/TemplateSearchBar"
import {isKeyPressed} from "../../misc/KeyManager"
import {Keys} from "../../api/common/TutanotaConstants"
import {SELECT_NEXT_TEMPLATE, SELECT_PREV_TEMPLATE} from "../../templates/model/TemplatePopupModel"
import {Icon} from "../../gui/base/Icon"
import {Icons} from "../../gui/base/icons/Icons"
import {windowFacade} from "../../misc/WindowFacade"

type KnowledgebaseViewAttrs = {
	onTemplateSelect: (EmailTemplate) => void,
	model: KnowledgeBaseModel,
	parentDialog: Dialog
}

export const KNOWLEDGEBASE_PANEL_HEIGHT = 840;
export const KNOWLEDGEBASE_PANEL_WIDTH = 500;//575;
export const KNOWLEDGEBASE_PANEL_TOP = 120;

export type Page =
	| {type: "list"}
	| {type: "entry", entry: IdTuple}

/**
 *  Renders the SearchBar and the pages (list, entry, template) of the knowledgeBase besides the MailEditor
 */

export class KnowledgeBaseView implements MComponent<KnowledgebaseViewAttrs> {
	_searchbarValue: Stream<string>
	_redrawStream: Stream<*>
	_pages: Stream<Array<Page>>
	_inputDom: HTMLElement
	_scrollDom: HTMLElement
	_resizeListener: windowSizeListener

	constructor({attrs}: Vnode<KnowledgebaseViewAttrs>) {
		this._searchbarValue = stream("")
		this._pages = stream([{type: "list"}])

	}


	oncreate({attrs}: Vnode<KnowledgebaseViewAttrs>) {
		const {model} = attrs
		this._redrawStream = stream.combine(() => {
			m.redraw()
		}, [model.selectedEntry, model.filteredEntries])

	}

	onremove() {
		if (this._redrawStream) {
			this._redrawStream.end(true)
		}
	}

	view({attrs}: Vnode<KnowledgebaseViewAttrs>): Children {
		return m(".flex.flex-column.abs.elevated-bg.dropdown-shadow.ml-s", {
			style: {
				height: px(KNOWLEDGEBASE_PANEL_HEIGHT),
				width: px(KNOWLEDGEBASE_PANEL_WIDTH),
				top: px(KNOWLEDGEBASE_PANEL_TOP),
			},
			oncreate: () => {
				windowFacade.addResizeListener(this._resizeListener)
			},
			onremove: () => {
				windowFacade.removeResizeListener(this._resizeListener)
			},
		}, [this._renderHeader(attrs), m(".mr-s.", this._renderCurrentPageContent(attrs))])
	}

	_renderCurrentPageContent(attrs: KnowledgebaseViewAttrs): Children {
		const model = attrs.model
		const currentPage = lastThrow(this._pages())
		switch (currentPage.type) {
			case "list":
				return [this._renderSearchBar(model), this._renderKeywords(model), this._renderList(model)]
			case "entry":
				const entry = model.selectedEntry()
				if (!entry) return null
				return m(KnowledgeBaseEntryView, {
					entry: entry,
					onTemplateSelected: (templateId) => {
						model.loadTemplate(templateId).then((fetchedTemplate) => {
							attrs.onTemplateSelect(fetchedTemplate)
						}).catch(NotFoundError, () => Dialog.error("templateNotExists_msg"))
					},
				})
			default:
				throw new Error(`invalid knowledge base view page type "${currentPage.type}"`)
		}
	}

	_renderHeader(attrs: KnowledgebaseViewAttrs): Children {
		const currentPage = lastThrow(this._pages())
		const knowledgebase = attrs.model
		switch (currentPage.type) {
			case "list":
				return renderHeaderBar(lang.get("knowledgebase_label"), {
					label: "close_alt",
					click: () => {
						attrs.parentDialog.close()
					},
					type: ButtonType.Secondary,
				}, this.createAddButtonAttributes(attrs))
			case "entry":
				const entry = knowledgebase.selectedEntry()
				if (!entry) return null
				return renderHeaderBar(entry.title, {
					label: "back_action",
					click: () => this._removeLastPage(),
					type: ButtonType.Secondary
				}, {
					label: "editEntry_label",
					click: () => {
						locator.entityClient.load(TemplateGroupRootTypeRef, neverNull(entry._ownerGroup)).then(groupRoot => {
							import("../../settings/KnowledgeBaseEditor").then(editor => {
								editor.showKnowledgeBaseEditor(entry, groupRoot)
							})
						})
					},
					type: ButtonType.Primary,
				})
			default:
				throw new Error("stub")

		}
	}

	_renderSearchBar(model: KnowledgeBaseModel): Children {
		return m(".ml-s", m(TemplateSearchBar, {
			value: this._searchbarValue,
			placeholder: "filter_label",
			oninput: (input) => {
				model.filter(input)
			},
			keyHandler: (keyPress) => {
				if (isKeyPressed(keyPress.keyCode, Keys.DOWN, Keys.UP)) {
					const changedSelection = model.selectNextEntry(isKeyPressed(keyPress.keyCode, Keys.UP)
						? SELECT_PREV_TEMPLATE
						: SELECT_NEXT_TEMPLATE)
					if (changedSelection) {
						this._scroll(model)
					}
					return false
				} else {
					return true
				}
			}
		}))
	}

	_renderKeywords(model: KnowledgeBaseModel): Children {
		const matchedKeywords = model.getMatchedKeywordsInContent()
		return m(".flex.mt-s.wrap", [
			matchedKeywords.length > 0
				? m(".small.full-width", lang.get("matchingKeywords_label"))
				: null,
			matchedKeywords.map(keyword => {
				return m(".bubbleTag-no-padding.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", keyword)
			})
		])
	}

	_renderList(model: KnowledgeBaseModel): Children {
		return m(".mt-s.scroll", {
			oncreate: (vnode) => {
				this._scrollDom = vnode.dom
			}
		}, [
			model.containsResult()
				? model.filteredEntries().map((entry, index) => this._renderListEntry(model, entry, index))
				: m(".center", lang.get("noEntryFound_label"))
		])
	}

	_renderListEntry(model: KnowledgeBaseModel, entry: KnowledgeBaseEntry, index: number): Children {
		return m(".flex.flex-column.click", [
			m(".flex.template-list-row" + (model.isSelectedEntry(entry) ? ".row-selected" : ""), {

				onclick: () => {
					model.selectedEntry(entry)
					this._pages(this._pages().concat({type: "entry", entry: entry._id}))
				}
			}, [
				m(KnowledgeBaseListEntry, {entry: entry}),
				model.isSelectedEntry(entry) ? m(Icon, {
					icon: Icons.ArrowForward,
					style: {marginTop: "auto", marginBottom: "auto"}
				}) : m("", {style: {width: "17.1px", height: "16px"}})
			])
		])
	}

	_scroll(model: KnowledgeBaseModel) {
		this._scrollDom.scroll({
			top: (KNOWLEDGEBASE_LIST_ENTRY_HEIGHT * model._getSelectedEntryIndex()),
			left: 0,
			behavior: 'smooth'
		})
	}

	_removeLastPage() {
		this._pages(this._pages().slice(0, -1))
	}

	createAddButtonAttributes(a: KnowledgebaseViewAttrs): ButtonAttrs {
		const templateGroupInstances = a.model.getTemplateGroupInstances()
		if (templateGroupInstances.length === 1) {
			return {
				label: "addEntry_label",
				click: () => {
					import("../../settings/KnowledgeBaseEditor").then(editor => {
						editor.showKnowledgeBaseEditor(null, templateGroupInstances[0].groupRoot)
					})
				},
				type: ButtonType.Primary,
			}
		} else {
			return attachDropdown({
				label: "addEntry_label",
				click: noOp,
				type: ButtonType.Primary,
			}, () => templateGroupInstances.map(groupInstances => {
				return {
					label: () => groupInstances.groupInfo.name,
					click: () => {
						import("../../settings/KnowledgeBaseEditor").then(editor => {
							editor.showKnowledgeBaseEditor(null, groupInstances.groupRoot)
						})
					},
					type: ButtonType.Dropdown,
				}
			}))
		}
	}
}

export function renderHeaderBar(title: string, leftButtonAttrs?: ButtonAttrs, rightButtonAttrs?: ButtonAttrs): Children {
	return m(".pr.pl", m(DialogHeaderBar, { // padding right because otherwise the right button would be directly on the edge
		middle: () => title,
		left: leftButtonAttrs
			? [leftButtonAttrs]
			: [],
		right: rightButtonAttrs
			? [rightButtonAttrs]
			: []
	}))

}

