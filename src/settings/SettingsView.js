// @flow
import m from "mithril"
import {assertMainOrNode, isApp, isDesktop, isIOSApp, isTutanotaDomain} from "../api/common/Env"
import {ColumnType, ViewColumn} from "../gui/base/ViewColumn"
import {ViewSlider} from "../gui/base/ViewSlider"
import {SettingsFolder} from "./SettingsFolder"
import {lang} from "../misc/LanguageViewModel"
import type {CurrentView} from "../gui/base/Header"
import {LoginSettingsViewer} from "./LoginSettingsViewer"
import {GlobalSettingsViewer} from "./GlobalSettingsViewer"
import {DesktopSettingsViewer} from "./DesktopSettingsViewer"
import {MailSettingsViewer} from "./MailSettingsViewer"
import {UserListView} from "./UserListView"
import type {User} from "../api/entities/sys/User"
import {UserTypeRef} from "../api/entities/sys/User"
import {load, serviceRequestVoid} from "../api/main/Entity"
import {Button} from "../gui/base/Button"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonColors} from "../gui/base/ButtonN"
import {logins} from "../api/main/LoginController"
import {GroupListView} from "./GroupListView"
import {ContactFormListView} from "./ContactFormListView"
import {WhitelabelSettingsViewer} from "./WhitelabelSettingsViewer"
import {Icons} from "../gui/base/icons/Icons"
import {theme} from "../gui/theme"
import {FeatureType, GroupType} from "../api/common/TutanotaConstants"
import {BootIcons} from "../gui/base/icons/BootIcons"
import {locator} from "../api/main/MainLocator"
import {WhitelabelChildrenListView} from "./WhitelabelChildrenListView"
import {SubscriptionViewer} from "../subscription/SubscriptionViewer"
import {PaymentViewer} from "../subscription/PaymentViewer"
import type {EntityUpdateData} from "../api/main/EventController"
import {isUpdateForTypeRef} from "../api/main/EventController"
import {showUserImportDialog} from "./UserViewer"
import {LazyLoaded} from "../api/common/utils/LazyLoaded"
import {getAvailableDomains} from "./AddUserDialog"
import {CustomerInfoTypeRef} from "../api/entities/sys/CustomerInfo"
import {AppearanceSettingsViewer} from "./AppearanceSettingsViewer"
import type {NavButtonAttrs} from "../gui/base/NavButtonN"
import {isNavButtonSelected, NavButtonN} from "../gui/base/NavButtonN"
import {Dialog} from "../gui/base/Dialog"
import {AboutDialog} from "./AboutDialog"
import {navButtonRoutes, SETTINGS_PREFIX} from "../misc/RouteChange"
import {size} from "../gui/size"
import {FolderColumnView} from "../gui/base/FolderColumnView"
import {getEtId, isSameId} from "../api/common/utils/EntityUtils";
import {TemplateListView} from "./TemplateListView"
import {KnowledgeBaseListView} from "./KnowledgeBaseListView"
import {promiseMap} from "../api/common/utils/PromiseUtils"
import {loadTemplateGroupInstances} from "../templates/model/TemplateModel"
import {showAddTemplateGroupDialog} from "./AddGroupDialog"
import type {TemplateGroupInstance} from "../templates/model/TemplateGroupModel"
import {showGroupSharingDialog} from "../sharing/view/GroupSharingDialog"
import {moreButton} from "../gui/base/GuiUtils"
import {flat} from "../api/common/utils/ArrayUtils"
import {GroupInvitationFolderRow} from "../sharing/view/GroupInvitationFolderRow"
import {SidebarSection} from "../gui/SidebarSection"
import {ReceivedGroupInvitationsModel} from "../sharing/model/ReceivedGroupInvitationsModel"
import {createTemplateGroupDeleteData} from "../api/entities/tutanota/TemplateGroupDeleteData"
import {isSharedGroupOwner, TemplateGroupPreconditionFailedReason} from "../sharing/GroupUtils"
import {SysService} from "../api/entities/sys/Services"
import {HttpMethod} from "../api/common/EntityFunctions"
import {TutanotaService} from "../api/entities/tutanota/Services"
import {PreconditionFailedError} from "../api/common/error/RestError"
import {showProgressDialog} from "../gui/ProgressDialog"

assertMainOrNode()

export class SettingsView implements CurrentView {

	view: Function;
	viewSlider: ViewSlider;
	_settingsFoldersColumn: ViewColumn;
	_settingsColumn: ViewColumn;
	_settingsDetailsColumn: ViewColumn;
	_userFolders: SettingsFolder<void>[];
	_adminFolders: SettingsFolder<void>[];
	_templateFolders: SettingsFolder<TemplateGroupInstance>[];
	_knowledgeBaseFolders: SettingsFolder<void>[];
	_selectedFolder: SettingsFolder<*>;
	_currentViewer: ?UpdatableSettingsViewer;
	detailsViewer: ?UpdatableSettingsViewer; // the component for the details column. can be set by settings views
	_customDomains: LazyLoaded<string[]>;

	_templateInvitations: ReceivedGroupInvitationsModel

	constructor() {
		this._userFolders = [
			new SettingsFolder("login_label", () => BootIcons.Contacts, "login", () => new LoginSettingsViewer()),
			new SettingsFolder("email_label", () => BootIcons.Mail, "mail", () => new MailSettingsViewer()),
			new SettingsFolder("appearanceSettings_label", () => Icons.Palette, "appearance", () => new AppearanceSettingsViewer()),
		]

		if (isDesktop()) {
			this._userFolders.push(new SettingsFolder("desktop_label", () => Icons.Desktop, "desktop", () => {

				const desktopSettingsViewer = new DesktopSettingsViewer()
				import("../native/common/NativeWrapper").then(({nativeApp}) => {
					nativeApp.setAppUpdateListener(() => desktopSettingsViewer.onAppUpdateAvailable())
				})
				return desktopSettingsViewer
			}))
		}

		this._adminFolders = []

		this._adminFolders.push(new SettingsFolder("adminUserList_action", () => BootIcons.Contacts, "users", () => new UserListView(this)))
		if (!logins.isEnabled(FeatureType.WhitelabelChild)) {
			this._adminFolders.push(new SettingsFolder("groups_label", () => Icons.People, "groups", () => new GroupListView(this)))
		}
		if (logins.getUserController().isGlobalAdmin()) {
			this._adminFolders.push(new SettingsFolder("globalSettings_label", () => BootIcons.Settings, "global", () => new GlobalSettingsViewer()))
			if (!logins.isEnabled(FeatureType.WhitelabelChild) && !isIOSApp()) {
				this._adminFolders.push(new SettingsFolder("whitelabel_label", () => Icons.Wand, "whitelabel", () => new WhitelabelSettingsViewer()))
				if (logins.isEnabled(FeatureType.WhitelabelParent)) {
					this._adminFolders.push(new SettingsFolder("whitelabelAccounts_label", () => Icons.People, "whitelabelaccounts", () => new WhitelabelChildrenListView(this)))
				}
			}
		}
		if (!logins.isEnabled(FeatureType.WhitelabelChild)) {
			this._adminFolders.push(new SettingsFolder("contactForms_label", () => Icons.Chat, "contactforms", () => new ContactFormListView(this)))
			if (logins.getUserController().isGlobalAdmin()) {
				this._adminFolders.push(new SettingsFolder("adminSubscription_action", () => BootIcons.Premium, "subscription", () => new SubscriptionViewer())
					.setIsVisibleHandler(() => !isIOSApp() || !logins.getUserController().isFreeAccount()))
				this._adminFolders.push(new SettingsFolder("adminPayment_action", () => Icons.Cash, "invoice", () => new PaymentViewer())
					.setIsVisibleHandler(() => !logins.getUserController().isFreeAccount()))
			}
		}

		this._templateFolders = []
		this._makeTemplateFolders().then(folders => {
			this._templateFolders = folders
			m.redraw()
		})

		this._knowledgeBaseFolders = []
		this._makeKnowledgeBaseFolders().then(folders => {
			this._knowledgeBaseFolders = folders
			m.redraw()
		})

		this._selectedFolder = this._userFolders[0]

		const addTemplateGroupButtonAttrs: ButtonAttrs = {
			label: () => "Add template group", // TODO Translate
			icon: () => Icons.Add,
			click: () => showAddTemplateGroupDialog()
		}

		this._templateInvitations =
			new ReceivedGroupInvitationsModel(GroupType.Template, locator.eventController, locator.entityClient, logins)
		this._templateInvitations.invitations.map(m.redraw.bind(m))
		this._templateInvitations.init()

		this._settingsFoldersColumn = new ViewColumn({
			onbeforeremove: () => {
				this._templateInvitations.dispose()
			},
			view: () => {
				const hasTemplates = this._templateFolders.length > 0
				const hasTemplateInvitations = this._templateInvitations.invitations().length > 0
				return m(FolderColumnView, {
					button: null,
					content: m(".flex.flex-grow.col", [
						m(SidebarSection, {
							label: "userSettings_label",
						}, this._createSidebarSectionChildren(this._userFolders)),
						logins.isUserLoggedIn() && logins.getUserController().isGlobalOrLocalAdmin()
							? m(SidebarSection, {
								label: "adminSettings_label",
							}, this._createSidebarSectionChildren(this._adminFolders))
							: null,
						m(SidebarSection, {
								label: "template_label",
								buttonAttrs: addTemplateGroupButtonAttrs,
							},
							[
								this._templateFolders.map(folder => this._createTemplateFolderRow(folder)),
								hasTemplateInvitations
									? m(SidebarSection, {
										// TODO Translate
										label: () => "Template Invitations"
									}, this._templateInvitations.invitations().map(invitation => m(GroupInvitationFolderRow, {invitation})))
									: null
							]),
						hasTemplates
							? m(SidebarSection, {
								label: "knowledgebase_label",
							}, this._createSidebarSectionChildren(this._knowledgeBaseFolders))
							: null,
						isTutanotaDomain() ? this._aboutThisSoftwareLink() : null,
					]),
					ariaLabel: "settings_label"
				})
			}
		}, ColumnType.Foreground, size.first_col_min_width, size.first_col_max_width, () => lang.get("settings_label"))

		this._settingsColumn = new ViewColumn({
			view: () => m(this._getCurrentViewer())
		}, ColumnType.Background, 400, 600, () => lang.getMaybeLazy(this._selectedFolder.name))

		this._settingsDetailsColumn = new ViewColumn({
			view: () => (this.detailsViewer) ? m(this.detailsViewer) : m("")
		}, ColumnType.Background, 600, 2400, () => lang.get("settings_label"))

		this.viewSlider = new ViewSlider([
			this._settingsFoldersColumn, this._settingsColumn, this._settingsDetailsColumn
		], "SettingsView")


		this.view = (): Vnode<any> => {
			return m("#settings.main-view", m(this.viewSlider))
		}
		locator.eventController.addEntityListener((updates) => {
			return this.entityEventsReceived(updates)
		})

		this._customDomains = new LazyLoaded(() => {
			return getAvailableDomains(true)
		})
		this._customDomains.getAsync().then(() => m.redraw())
	}

	_createSettingsFolderNavButton(folder: SettingsFolder<*>): NavButtonAttrs {
		return {
			label: folder.name,
			icon: folder.icon,
			href: folder.url,
			colors: ButtonColors.Nav,
			click: () => this.viewSlider.focus(this._settingsColumn),
			isVisible: () => folder.isVisible()
		}
	}

	_createTemplateFolderRow(folder: SettingsFolder<TemplateGroupInstance>): Children {
		return m(".folder-row.plr-l.flex.flex-row", [
			m(NavButtonN, this._createSettingsFolderNavButton(folder)),
			moreButton([
				isSharedGroupOwner(folder.data.userGroup, getEtId(logins.getUserController().user))
					? {
						label: "delete_action",
						click: () => {
							// TODO Translate
							Dialog.confirm(() => "Are you sure you to delete this template group? all of the templates will be lost (forever)")
							      .then(doDelete => {
								      if (doDelete) {
									      const deleteData = createTemplateGroupDeleteData({group: folder.data.groupInfo.group})
									      showProgressDialog("pleaseWait_msg",
										      serviceRequestVoid(TutanotaService.TemplateGroupService, HttpMethod.DELETE, deleteData))
								      }
							      })
						}
					} : null,
				{
					label: "sharing_label",
					click: () => // TODO Translate
						showGroupSharingDialog(folder.data.groupInfo, true, {
							defaultGroupName: "PUT TEXT HERE",
							shareEmailSubject: "PUT TEXT HERE",
							shareEmailBody: (groupName: string, sharer: string) => "PUT TEXT HERE",
							addMemberMessage: (groupName: string) => "PUT TEXT HERE",
							removeMemberMessage: (groupName: string, member: string) => "PUT TEXT HERE",
						}),
				}
			])
		])
	}

	_createSidebarSectionChildren(folders: SettingsFolder<void>[]): Children {
		let importUsersButton = new Button('importUsers_action',
			() => showUserImportDialog(this._customDomains.getLoaded()),
			() => Icons.ContactImport
		).setColors(ButtonColors.Nav)
		const buttons = folders.map(folder => this._createSettingsFolderNavButton(folder))

		return m("",
			folders
				.filter(folder => folder.isVisible())
				.map(folder => this._createSettingsFolderNavButton(folder))
				.map(button => m(".folder-row.flex-start.plr-l" + (isNavButtonSelected(button) ? ".row-selected" : ""), [
						m(NavButtonN, button),
						!isApp() && isNavButtonSelected(button) && this._selectedFolder && m.route.get().startsWith('/settings/users')
						&& this._customDomains.isLoaded()
						&& this._customDomains.getLoaded().length > 0
							? m(importUsersButton)
							: null
					])
				))
	}

	_getCurrentViewer(): Component {
		if (!this._currentViewer) {
			this.detailsViewer = null
			this._currentViewer = this._selectedFolder.viewerCreator()
		}
		return this._currentViewer
	}

	/**
	 * Notifies the current view about changes of the url within its scope.
	 */
	updateUrl(args: Object) {
		if (!args.folder) {
			this._setUrl(this._userFolders[0].url)
		} else if (args.folder || !m.route.get().startsWith("/settings")) { // ensure that current viewer will be reinitialized
			const folder = this._allSettingsFolders().find(f => f.path === args.folder)
			if (!folder) {
				this._setUrl(this._userFolders[0].url)
			} else if (this._selectedFolder.path === folder.path) {// folder path has not changed
				this._selectedFolder = folder // instance of SettingsFolder might have been changed in membership update, so replace this instance
				m.redraw()
			} else { // folder path has changed
				this._selectedFolder = folder
				this._currentViewer = null
				this.detailsViewer = null
				// make sure the currentViewer is available. if we do not call this._getCurrentViewer(), the floating + button is not always visible
				this._getCurrentViewer()
				navButtonRoutes.settingsUrl = folder.url
				m.redraw()
			}
		}
	}

	_allSettingsFolders(): $ReadOnlyArray<SettingsFolder<*>> {
		return flat([this._userFolders, this._adminFolders, this._templateFolders, this._knowledgeBaseFolders])
	}

	_setUrl(url: string) {
		navButtonRoutes.settingsUrl = url
		m.route.set(url + location.hash)
	}

	_isGlobalOrLocalAdmin(user: User): boolean {
		return user.memberships.find(m => m.groupType === GroupType.Admin || m.groupType === GroupType.LocalAdmin)
			!= null
	}

	focusSettingsDetailsColumn() {
		this.viewSlider.focus(this._settingsDetailsColumn)
	}

	entityEventsReceived<T>(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return promiseMap(updates, update => {
			if (isUpdateForTypeRef(UserTypeRef, update) && isSameId(update.instanceId, logins.getUserController().user._id)) {
				return load(UserTypeRef, update.instanceId).then(user => {
					// the user admin status might have changed
					if (!this._isGlobalOrLocalAdmin(user) && this._currentViewer
						&& this._adminFolders.find(f => f.isActive())) {
						this._setUrl(this._userFolders[0].url)
					}
					// template group memberships may have changed
					if (this._templateFolders.length !== logins.getUserController().getTemplateMemberships().length) {
						Promise.all([this._makeTemplateFolders(), this._makeKnowledgeBaseFolders()])
						       .then(([templates, knowledgeBases]) => {
							       this._templateFolders = templates
							       this._knowledgeBaseFolders = knowledgeBases
							       if (m.route.get().startsWith(SETTINGS_PREFIX)) {
								       this._setUrl(m.route.get())
							       }
						       })
					}
					m.redraw()
				})
			} else if (isUpdateForTypeRef(CustomerInfoTypeRef, update)) {
				this._customDomains.reset()
				return this._customDomains.getAsync().then(() => m.redraw())
			}
		}).then(() => {
			if (this._currentViewer) {
				return this._currentViewer.entityEventsReceived(updates)
			}
		}).then(() => {
			if (this.detailsViewer) {
				return this.detailsViewer.entityEventsReceived(updates)
			}
		})
	}

	getViewSlider(): ? IViewSlider {
		return this.viewSlider
	}

	_aboutThisSoftwareLink(): Vnode<any> {
		return m(".pb.pt-l.flex-no-shrink.flex.col.justify-end", [
			m("button.text-center.small.no-text-decoration", {
					style: {
						backgroundColor: "transparent",
					},
					href: '#',
					onclick: () => {
						this.viewSlider.focusNextColumn()
						setTimeout(() => {
							Dialog.showActionDialog({
								title: () => lang.get("about_label"),
								child: () => m(AboutDialog),
								allowOkWithReturn: true,
								okAction: (dialog) => dialog.close(),
								allowCancel: false,
							})
						}, 200)
					}
				}, [
					m("", `Tutanota v${env.versionNumber}`),
					m(".b", {
						style: {color: theme.navigation_button_selected}
					}, lang.get("about_label"))
				]
			)
		])
	}

	_makeTemplateFolders(): Promise<Array<SettingsFolder<TemplateGroupInstance>>> {
		const templateMemberships = logins.getUserController() && logins.getUserController().getTemplateMemberships() || []
		return promiseMap(loadTemplateGroupInstances(templateMemberships, locator.entityClient),
			groupInstance =>
				new SettingsFolder(() => groupInstance.groupInfo.name,
					() => Icons.Folder,
					`template-${groupInstance.groupInfo.name}`,
					() => new TemplateListView(this, groupInstance, locator.entityClient, logins),
					groupInstance))
	}


	_makeKnowledgeBaseFolders(): Promise<Array<SettingsFolder<void>>> {
		const templateMemberships = logins.getUserController() && logins.getUserController().getTemplateMemberships() || []
		return promiseMap(loadTemplateGroupInstances(templateMemberships, locator.entityClient),
			groupInstance =>
				new SettingsFolder(() => groupInstance.groupInfo.name,
					() => Icons.Folder,
					`knowledgeBase-${groupInstance.groupInfo.name}`,
					() => new KnowledgeBaseListView(this, locator.entityClient, logins, groupInstance.groupRoot, groupInstance.userGroup)))
	}
}

