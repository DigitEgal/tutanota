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
import {getElementId, isSameId} from "../../api/common/utils/EntityUtils"
import type {TemplateGroupInstance} from "../../templates/model/TemplateGroupModel"
import {promiseMap} from "../../api/common/utils/PromiseUtils"
import {loadTemplateGroupInstance} from "../../templates/model/TemplatePopupModel"
import {LazyLoaded} from "../../api/common/utils/LazyLoaded"
import type {IUserController} from "../../api/main/UserController"

export const SELECT_NEXT_ENTRY = "next";

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
	+_entityClient: EntityClient;
	+_entityEventReceived: EntityEventsListener;
	_groupInstances: Array<TemplateGroupInstance>
	_initialized: LazyLoaded<KnowledgeBaseModel>
	_userController: IUserController

	constructor(eventController: EventController, entityClient: EntityClient, userController: IUserController) {
		this._eventController = eventController
		this._entityClient = entityClient
		this._userController = userController
		this._allEntries = []
		this._allKeywords = []
		this._matchedKeywordsInContent = []
		this.filteredEntries = stream(this._allEntries)
		this.selectedEntry = stream(null)
		this._filterValue = ""
		this._entityEventReceived = (updates) => {
			return this._entityUpdate(updates)
		}
		this._eventController.addEntityListener(this._entityEventReceived)
		this._groupInstances = []
		this._allKeywords = []
		this.filteredEntries(this._allEntries)
		this.selectedEntry(this.containsResult() ? this.filteredEntries()[0] : null)
		this._initialized = new LazyLoaded(() => {
			console.log("initializing template model")
			const templateMemberships = this._userController.getTemplateMemberships()
			let newGroupInstances = []
			return promiseMap(templateMemberships, membership => loadTemplateGroupInstance(membership, entityClient))
				.then(groupInstances => {
					newGroupInstances = groupInstances
					return loadKnowledgebaseEntries(groupInstances, entityClient)
				}).then(knowledgebaseEntries => {
					this._allEntries = knowledgebaseEntries
					this._groupInstances = newGroupInstances
					this.initAllKeywords()
					return this
				})
		})
	}


	init(): Promise<KnowledgeBaseModel> {
		return this._initialized.getAsync()
	}

	isInitialized(): boolean {
		return this._initialized.isLoaded()
	}

	getTemplateGroupInstances(): Array<TemplateGroupInstance> {
		return this._groupInstances
	}

	initAllKeywords() {
		this._allKeywords = []
		this._matchedKeywordsInContent = []
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

function loadKnowledgebaseEntries(templateGroups: Array<TemplateGroupInstance>, entityClient: EntityClient): Promise<Array<KnowledgeBaseEntry>> {
	return promiseMap(templateGroups, group => entityClient.loadAll(KnowledgeBaseEntryTypeRef, group.groupRoot.knowledgeBase))
		.then(groupedTemplates => groupedTemplates.flat())
}
