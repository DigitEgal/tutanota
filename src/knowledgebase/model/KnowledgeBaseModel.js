//@flow
import type {KnowledgeBaseEntry} from "../../api/entities/tutanota/KnowledgeBaseEntry"
import type {EmailTemplate} from "../../api/entities/tutanota/EmailTemplate"
import {EventController, isUpdateForTypeRef} from "../../api/main/EventController"
import type {EntityEventsListener, EntityUpdateData} from "../../api/main/EventController"
import {EntityClient} from "../../api/common/EntityClient"
import {KnowledgeBaseEntryTypeRef} from "../../api/entities/tutanota/KnowledgeBaseEntry"
import {knowledgeBaseSearch} from "./KnowledgeBaseSearchFilter"
import type {LanguageCode} from "../../misc/LanguageViewModel"
import stream from "mithril/stream/stream.js"
import {findAndRemove} from "../../api/common/utils/ArrayUtils"
import {OperationType} from "../../api/common/TutanotaConstants"
import {EmailTemplateTypeRef} from "../../api/entities/tutanota/EmailTemplate"
import {lang} from "../../misc/LanguageViewModel"
import {downcast} from "../../api/common/utils/Utils"
import type {LoginController} from "../../api/main/LoginController"
import type {TemplateGroupRoot} from "../../api/entities/tutanota/TemplateGroupRoot"
import {TemplateGroupModel} from "../../templates/model/TemplateGroupModel"
import {getElementId, isSameId} from "../../api/common/utils/EntityUtils"

export const SELECT_NEXT_ENTRY = "next";
export const SELECT_PREV_ENTRY = "previous";

/**
 *   Model that holds main logic for the Knowdledgebase.
 */
export class KnowledgeBaseModel {
	_allEntries: Array<KnowledgeBaseEntry>
	filteredEntries: Stream<Array<KnowledgeBaseEntry>>
	selectedEntry: Stream<?KnowledgeBaseEntry>
	_allKeywords: Array<string>
	_matchedKeywordsInContent: Array<?string>
	_filterValue: string
	+_eventController: EventController;
	+_entityEventReceived: EntityEventsListener;
	+_logins: LoginController;
	+_entityClient: EntityClient;
	_templateGroupRoot: ?TemplateGroupRoot
	_templateGroupModel: TemplateGroupModel;


	constructor(eventController: EventController, logins: LoginController, entityClient: EntityClient, templateGroupModel: TemplateGroupModel) {
		this._eventController = eventController
		this._logins = logins
		this._entityClient = entityClient
		this._allEntries = []
		this._allKeywords = []
		this._matchedKeywordsInContent = []
		this.filteredEntries = stream(this._allEntries)
		this.selectedEntry = stream(null)
		this._filterValue = ""
		this._templateGroupModel = templateGroupModel
		this._entityEventReceived = (updates) => {
			return this._entityUpdate(updates)
		}
		this._eventController.addEntityListener(this._entityEventReceived)
	}

	init(): Promise<void> {
		const allEntries = []
		return this._templateGroupModel.init().then(templateGroupInstances => {
			Promise.each(templateGroupInstances, templateGroupInstance => {
				return this._entityClient.loadAll(KnowledgeBaseEntryTypeRef, templateGroupInstance.groupRoot.knowledgeBase)
				           .then((entries) => {
					           allEntries.push(...entries)
				           })
			}).then(() => {
				this._allEntries = allEntries
				this.initAllKeywords()
				this.filteredEntries(this._allEntries)
				this.selectedEntry(this.containsResult() ? this.filteredEntries()[0] : null)
			})
		})
	}

	initAllKeywords() {
		this._allKeywords = []
		this._allEntries.forEach(entry => {
			entry.keywords.forEach(keyword => {
				this._allKeywords.push(keyword.keyword)
			})
		})

	}

	isSelectedEntry(entry: KnowledgeBaseEntry): boolean {
		return this.selectedEntry() === entry
	}

	containsResult(): boolean {
		return this.filteredEntries().length > 0
	}

	getAllKeywords(): Array<string> {
		return this._allKeywords.sort()
	}

	getMatchedKeywordsInContent(): Array<?string> {
		return this._matchedKeywordsInContent
	}

	getLanguageFromTemplate(template: EmailTemplate): LanguageCode {
		const clientLanguage = lang.code
		const hasClientLanguage = template.contents.some(
			(content) => content.languageCode === clientLanguage
		)
		if (hasClientLanguage) {
			return clientLanguage
		}
		return downcast(template.contents[0].languageCode)
	}

	sortEntriesByMatchingKeywords(emailContent: string) {
		this._matchedKeywordsInContent = []
		const emailContentNoTags = emailContent.replace(/(<([^>]+)>)/ig, "") // remove all html tags
		this._allKeywords.forEach(keyword => {
			if (emailContentNoTags.includes(keyword)) {
				this._matchedKeywordsInContent.push(keyword)
			}
		})
		this._sortEntries(this._allEntries)
		this._filterValue = ""
		this.filteredEntries(this._allEntries)
	}

	_sortEntries(entries: Array<KnowledgeBaseEntry>): void {
		entries.sort((a, b) => {
			return this._getMatchedKeywordsNumber(b) - this._getMatchedKeywordsNumber(a)
		})
	}

	_getMatchedKeywordsNumber(entry: KnowledgeBaseEntry): number {
		let matches = 0
		entry.keywords.forEach(k => {
			if (this._matchedKeywordsInContent.includes(k.keyword)) {
				matches++
			}
		})
		return matches
	}

	filter(input: string): void {
		this._filterValue = input
		const inputTrimmed = input.trim()
		if (inputTrimmed) {
			this.filteredEntries(knowledgeBaseSearch(inputTrimmed, this._allEntries))
		} else {
			this.filteredEntries(this._allEntries)
		}
	}

	selectNextEntry(action: string): boolean { // returns true if selection is changed
		const selectedIndex = this._getSelectedEntryIndex()
		const nextIndex = selectedIndex + (action === SELECT_NEXT_ENTRY ? 1 : -1)
		if (nextIndex >= 0 && nextIndex < this.filteredEntries().length) {
			const nextSelectedEntry = this.filteredEntries()[nextIndex]
			this.selectedEntry(nextSelectedEntry)
			return true
		}
		return false
	}

	_getSelectedEntryIndex(): number {
		return this.filteredEntries().indexOf(this.selectedEntry())
	}

	_removeFromAllKeywords(keyword: string) {
		const index = this._allKeywords.indexOf(keyword)
		if (index > -1) {
			this._allKeywords.splice(index, 1)
		}
	}

	dispose() {
		this._eventController.removeEntityListener(this._entityEventReceived)
	}

	loadTemplate(templateId: IdTuple): Promise<EmailTemplate> {
		return this._entityClient.load(EmailTemplateTypeRef, templateId)
	}

	_entityUpdate(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			if (isUpdateForTypeRef(KnowledgeBaseEntryTypeRef, update)) {
				if (update.operation === OperationType.CREATE) {
					return this._entityClient.load(KnowledgeBaseEntryTypeRef, [update.instanceListId, update.instanceId])
					           .then((entry) => {
						           this._allEntries.push(entry)
						           this._sortEntries(this._allEntries)
						           this.filter(this._filterValue)
					           })
				} else if (update.operation === OperationType.UPDATE) {
					return this._entityClient.load(KnowledgeBaseEntryTypeRef, [update.instanceListId, update.instanceId])
					           .then((updatedEntry) => {
						           findAndRemove(this._allEntries, (e) => isSameId(getElementId(e), update.instanceId))
						           this._allEntries.push(updatedEntry)
						           this._sortEntries(this._allEntries)
						           this.filter(this._filterValue)
						           const oldSelectedEntry = this.selectedEntry()
						           if (oldSelectedEntry && isSameId(oldSelectedEntry._id, updatedEntry._id)) {
							           this.selectedEntry(updatedEntry)
						           }
					           })
				} else if (update.operation === OperationType.DELETE) {
					findAndRemove(this._allEntries, (e) => isSameId(getElementId(e), update.instanceId))
					this.filter(this._filterValue)
				}
			}
		}).return()
	}
}

