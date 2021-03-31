// @flow
import m from "mithril"
import {KnowledgeBaseModel} from "../model/KnowledgeBaseModel"
import type {KnowledgeBaseEntry} from "../../api/entities/tutanota/KnowledgeBaseEntry"
import {KNOWLEDGEBASE_LIST_ENTRY_HEIGHT, KnowledgeBaseListEntry} from "./KnowledgeBaseListEntry"
import {lang} from "../../misc/LanguageViewModel"
import stream from "mithril/stream/stream.js"
import {KnowledgeBaseEntryView} from "./KnowledgeBaseEntryView"
import {lastThrow} from "../../api/common/utils/ArrayUtils"
import type {EmailTemplate} from "../../api/entities/tutanota/EmailTemplate"
import {NotFoundError} from "../../api/common/error/RestError"
import {Dialog} from "../../gui/base/Dialog"
import type {KeyPress} from "../../misc/KeyManager"
import {isKeyPressed} from "../../misc/KeyManager"
import {Keys} from "../../api/common/TutanotaConstants"
import {SELECT_NEXT_TEMPLATE, SELECT_PREV_TEMPLATE} from "../../templates/model/TemplatePopupModel"
import {Icon} from "../../gui/base/Icon"
import {Icons} from "../../gui/base/icons/Icons"
import type {TextFieldAttrs} from "../../gui/base/TextFieldN"
import {TextFieldN} from "../../gui/base/TextFieldN"
import {debounce} from "../../api/common/utils/Utils"

export type KnowledgebaseViewAttrs = {|
	+onTemplateSelect: (EmailTemplate,) => void,
	+model: KnowledgeBaseModel,
	+pages: Stream<Array<Page>>
|}

export type Page =
	| {type: "list"}
	| {type: "entry", entry: KnowledgeBaseEntry}

/**
 *  Renders the SearchBar and the pages (list, entry, template) of the knowledgeBase besides the MailEditor
 */
export class KnowledgeBaseView implements MComponent<KnowledgebaseViewAttrs> {

	_redrawStream: Stream<*>
	_scrollDom: HTMLElement
	_resizeListener: windowSizeListener
	_filterInputFieldAttrs: TextFieldAttrs

	constructor({attrs}: Vnode<KnowledgebaseViewAttrs>) {
		const model = attrs.model
		this._filterInputFieldAttrs = {
			label: () => lang.get("filter_label"),
			value: stream(""),
			keyHandler: (key: KeyPress) => {
				return this._handleKeyPressed(key, attrs.model)
			}
		}

		const debounceFilter = debounce(200, (value: string) => {
			model.filter(value)
			m.redraw()
		})


		this._filterInputFieldAttrs.value.map(newSearchString => {
			debounceFilter(newSearchString)
		})

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
		const model = attrs.model
		const currentPage = lastThrow(attrs.pages())
		switch (currentPage.type) {
			case "list":
				return [
					m(TextFieldN, this._filterInputFieldAttrs),
					this._renderKeywords(model),
					this._renderList(model, attrs)
				]
			case "entry":
				return m(KnowledgeBaseEntryView, {
					entry: currentPage.entry,
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

	_handleKeyPressed(keyPress: KeyPress, model: KnowledgeBaseModel): boolean {
		if (isKeyPressed(keyPress.keyCode, Keys.DOWN, Keys.UP)) {
			const changedSelection = model.selectNextEntry(isKeyPressed(keyPress.keyCode, Keys.UP)
				? SELECT_PREV_TEMPLATE
				: SELECT_NEXT_TEMPLATE)
			this._scroll(model)
			if (changedSelection) {
			}
			return false
		} else {
			return true
		}
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

	_renderList(model: KnowledgeBaseModel, attrs: KnowledgebaseViewAttrs): Children {
		return m(".mt-s.scroll", {
			oncreate: (vnode) => {
				this._scrollDom = vnode.dom
			}
		}, [
			model.containsResult()
				? model.filteredEntries().map((entry, index) => this._renderListEntry(model, entry, index, attrs))
				: m(".center", lang.get("noEntryFound_label"))
		])
	}

	_renderListEntry(model: KnowledgeBaseModel, entry: KnowledgeBaseEntry, index: number, attrs: KnowledgebaseViewAttrs): Children {
		return m(".flex.flex-column.click", [
			m(".flex.template-list-row" + (model.isSelectedEntry(entry) ? ".row-selected" : ""), {
				onclick: () => {
					model.selectedEntry(entry)
					attrs.pages(attrs.pages().concat({type: "entry", entry: entry}))
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


}



