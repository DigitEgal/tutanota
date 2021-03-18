//@flow

import m from "mithril"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {lang} from "../misc/LanguageViewModel"
import type {EntityUpdateData} from "../api/main/EventController"
import {List} from "../gui/base/List"
import {size} from "../gui/size"
import type {SettingsView} from "./SettingsView"
import {TemplateDetailsViewer} from "./TemplateDetailsViewer"
import {showTemplateEditor} from "./TemplateEditor"
import {createEmailTemplate, EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {assertMainOrNode} from "../api/common/Env"
import {isUpdateForTypeRef} from "../api/main/EventController"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {EntityClient} from "../api/common/EntityClient"
import {isSameId} from "../api/common/utils/EntityUtils"
import {createEmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {TEMPLATE_SHORTCUT_PREFIX} from "../templates/model/TemplateModel"

assertMainOrNode()

/**
 *  List that is rendered within the template Settings
 */

export class TemplateListView implements UpdatableSettingsViewer {
	_list: ?List<EmailTemplate, TemplateRow>
	_listId: ?Id
	_settingsView: SettingsView
	_templateGroupRoot: TemplateGroupRoot
	_entityClient: EntityClient

	constructor(settingsView: SettingsView, entityClient: EntityClient, templateGroupRoot: TemplateGroupRoot) {
		this._settingsView = settingsView
		this._entityClient = entityClient
		this._templateGroupRoot = templateGroupRoot
		this._listId = null
		this._initTemplateList()
	}

	_initTemplateList() {
		const templateListId = this._templateGroupRoot.templates
		const listConfig: ListConfig<EmailTemplate, TemplateRow> = {
			rowHeight: size.list_row_height,
			fetch: (startId, count) => {
				return this._entityClient.loadRange(EmailTemplateTypeRef, templateListId, startId, count, true)
			},
			loadSingle: (elementId) => {
				return this._entityClient.load(EmailTemplateTypeRef, [templateListId, elementId])
			},
			sortCompare: (a: EmailTemplate, b: EmailTemplate) => {
				var titleA = a.title.toUpperCase();
				var titleB = b.title.toUpperCase();
				return (titleA < titleB) ? -1 : (titleA > titleB) ? 1 : 0
			},
			elementSelected: (templates: Array<EmailTemplate>, elementClicked) => {
				if (elementClicked) {
					this._settingsView.detailsViewer = new TemplateDetailsViewer(templates[0], this._entityClient)
					this._settingsView.focusSettingsDetailsColumn()
				} else if (templates.length === 0 && this._settingsView.detailsViewer) {
					this._settingsView.detailsViewer = null
					m.redraw()
				}

			},
			createVirtualRow: () => {
				return new TemplateRow()
			},
			showStatus: false,
			className: "template-list",
			swipe: {
				renderLeftSpacer: () => [],
				renderRightSpacer: () => [],
				swipeLeft: (listElement) => Promise.resolve(false),
				swipeRight: (listElement) => Promise.resolve(false),
				enabled: false
			},
			elementsDraggable: false,
			multiSelectionAllowed: false,
			emptyMessage: lang.get("noEntries_msg"),
		}
		this._listId = templateListId
		this._list = new List(listConfig)
		this._list.loadInitial()
		m.redraw()
	}


	view(): Children {
		const templateGroupRoot = this._templateGroupRoot
		const entityClient = this._entityClient
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.plr-l.list-border-right.list-bg.list-header",
				m(".flex.flex-end.center-vertically", [
						m(".mr-negative-s", m("input[type=file][name=test]", {
							onchange: function () {
								const reader = new FileReader()
								reader.onload = () => {
									let array = parseCSV(String(reader.result))
									createTemplates(array, templateGroupRoot, entityClient)
								}
								reader.readAsBinaryString(this.files[0])
							}
						})),
						m(".mr-negative-s.align-self-end", m(ButtonN, {
							label: "addTemplate_label",
							type: ButtonType.Primary,
							click: () => {
								showTemplateEditor(null, this._templateGroupRoot)
							}
						})),
					]
				)),
			m(".rel.flex-grow", this._list ? m(this._list) : null)
		])
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			const list = this._list
			if (list && this._listId && isUpdateForTypeRef(EmailTemplateTypeRef, update) && isSameId(this._listId, update.instanceListId)) {
				return list.entityEventReceived(update.instanceId, update.operation)
			}
		}).then(() => {
			this._settingsView.detailsViewer = null
			m.redraw()
		})
	}
}

export function createTemplates(gorgiasTemplates: Array<Array<string>>, templateGroupRoot: TemplateGroupRoot, entityClient: EntityClient) {
	// id,title,shortcut,subject,tags,cc,bcc,to,body
	gorgiasTemplates.forEach(gorgiasTemplate => {
		let template = createEmailTemplate()
		let content
		const gorgiasTitle = gorgiasTemplate[1]
		const gorgiasId = gorgiasTemplate[2]
		const gorgiasTags = gorgiasTemplate[4]
		const gorgiasBody = gorgiasTemplate[8]

		template.title = gorgiasTitle.replace(/(^")|("$)/g, '') // remove quotes at the beginning and at the end
		template.tag = gorgiasId.replace(/(^")|("$)/g, '')

		// if the gorgias templates has tags, check if they include "ger" to create a german emailTemplateContent
		if (gorgiasTags) {
			if (gorgiasTags.includes("ger")) {
				content = createEmailTemplateContent({languageCode: "de", text: gorgiasBody.replace(/(^")|("$)/g, '')})
				template.contents.push(content)
			} else {
				content = createEmailTemplateContent({languageCode: "en", text: gorgiasBody.replace(/(^")|("$)/g, '')})
				template.contents.push(content)
			}
		} else { // use en as language if there are no tags in gorgias
			content = createEmailTemplateContent({languageCode: "en", text: gorgiasBody.replace(/(^")|("$)/g, '')})
			template.contents.push(content)
		}

		template._ownerGroup = templateGroupRoot._id
		entityClient.setup(templateGroupRoot.templates, template)
	})
}

export function parseCSV(data: string): Array<Array<string>> {
	let result = []
	// let lines = data.split("\r\n")
	let lines = data.split("\r\n") // temporary fix
	lines.shift()
	lines.forEach(line => {
		let lineAsArray = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) // ignore , inside quoted strings
		result.push(lineAsArray)
	})
	return result
}

export class TemplateRow {
	top: number;
	domElement: ?HTMLElement; // set from List
	entity: ?EmailTemplate;
	_domTemplateTitle: HTMLElement;
	_domTemplateId: HTMLElement;

	constructor() {
		this.top = 0 // is needed because of the list component
	}

	update(template: EmailTemplate, selected: boolean): void {
		if (!this.domElement) {
			return
		}
		if (selected) {
			this.domElement.classList.add("row-selected")
		} else {
			this.domElement.classList.remove("row-selected")
		}
		this._domTemplateTitle.textContent = template.title
		this._domTemplateId.textContent = TEMPLATE_SHORTCUT_PREFIX + template.tag
	}


	render(): Children {
		return [
			m(".top", [
				m(".name.text-ellipsis", {oncreate: (vnode) => this._domTemplateTitle = vnode.dom}),
			]),
			m(".bottom.flex-space-between", [
				m("small.templateContent", {oncreate: (vnode) => this._domTemplateId = vnode.dom}),
			])
		]
	}

}





