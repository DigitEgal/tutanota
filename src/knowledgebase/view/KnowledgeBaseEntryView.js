// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../../api/entities/tutanota/KnowledgeBaseEntry"
import type {KnowledgeBaseEntryKeywords} from "../../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import {lang} from "../../misc/LanguageViewModel"
import {memoized} from "../../api/common/utils/Utils"
import {htmlSanitizer} from "../../misc/HtmlSanitizer"
import {startsWith} from "../../api/common/utils/StringUtils"

type KnowledgeBaseEntryViewAttrs = {
	entry: KnowledgeBaseEntry,
	onTemplateSelected: (IdTuple) => void
}

/**
 *  Renders one knowledgeBase entry
 */

export class KnowledgeBaseEntryView implements MComponent<KnowledgeBaseEntryViewAttrs> {
	_sanitizedEntry: (KnowledgeBaseEntry) => {content: string}

	constructor() {
		this._sanitizedEntry = memoized((entry) => {
			return {
				content: htmlSanitizer.sanitize(entry.description, {blockExternalContent: true}).text,
			}
		})
	}

	view({attrs}: Vnode<KnowledgeBaseEntryViewAttrs>): Children {
		return m(".flex.flex-column", [
			this._renderContent(attrs)
		])
	}

	_renderContent(attrs: KnowledgeBaseEntryViewAttrs): Children {
		const {keywords} = attrs.entry
		return m(".flex.flex-column.scroll.mt-s", {
			onclick: (event) => {
				this._handleAnchorClick(event, attrs)
			}
		}, [
			m(".h5.mt-s", lang.get("keywords_label")),
			m(".flex.wrap.mt-s", [
				keywords.map(keyword => {
					return this._renderKeywords(keyword)
				})
			]),
			m(".h5.mt-l", lang.get("content_label")),
			m(".editor-border.text-break", m.trust(this._sanitizedEntry(attrs.entry).content)),
		])
	}

	_renderKeywords(keyword: KnowledgeBaseEntryKeywords): Children {
		return [
			m(".bubbleTag-no-padding.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", keyword.keyword)
		]
	}

	_handleAnchorClick(event: Event, attrs: KnowledgeBaseEntryViewAttrs): void {
		let target = (event.target: any)
		if (target && target.closest) {
			let anchorElement = target.closest("a")
			if (anchorElement && startsWith(anchorElement.href, "tutatemplate:")) {
				event.preventDefault()
				const [listId, elementId] = new URL(anchorElement.href).pathname.split("/")
				attrs.onTemplateSelected([listId, elementId])
			}
		}
	}
}