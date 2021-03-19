//@flow
import m from "mithril"
import type {ModalComponent} from "../../gui/base/Modal"
import {modal} from "../../gui/base/Modal"
import {px} from "../../gui/size"
import type {Shortcut} from "../../misc/KeyManager"
import {isKeyPressed} from "../../misc/KeyManager"
import type {PosRect} from "../../gui/base/Dropdown"
import type {TextFieldAttrs} from "../../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {Keys} from "../../api/common/TutanotaConstants"
import {TemplatePopupResultRow} from "./TemplatePopupResultRow"
import {Icons} from "../../gui/base/icons/Icons"
import {Icon} from "../../gui/base/Icon"
import {TemplateExpander} from "./TemplateExpander"
import {lang, languageByCode} from "../../misc/LanguageViewModel"
import {Dialog} from "../../gui/base/Dialog"
import {windowFacade} from "../../misc/WindowFacade"
import type {EmailTemplate} from "../../api/entities/tutanota/EmailTemplate"
import type {ButtonAttrs} from "../../gui/base/ButtonN"
import {ButtonColors, ButtonN, ButtonType} from "../../gui/base/ButtonN"
import {SELECT_NEXT_TEMPLATE, SELECT_PREV_TEMPLATE, TEMPLATE_SHORTCUT_PREFIX, TemplateModel} from "../model/TemplateModel"
import {attachDropdown} from "../../gui/base/DropdownN"
import {downcast, neverNull, noOp} from "../../api/common/utils/Utils"
import {locator} from "../../api/main/MainLocator"
import {TemplateGroupRootTypeRef} from "../../api/entities/tutanota/TemplateGroupRoot"
import {TemplateSearchBar} from "./TemplateSearchBar"
import {DomRectReadOnlyPolyfilled} from "../../gui/base/Dropdown"
import {Editor} from "../../gui/editor/Editor"

export const TEMPLATE_POPUP_HEIGHT = 340;
export const TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH = 600;
export const TEMPLATE_LIST_ENTRY_HEIGHT = 47;
export const TEMPLATE_LIST_ENTRY_WIDTH = 354;

/**
 *	Creates a Modal/Popup that allows user to paste templates directly into the MailEditor.
 *	Also allows user to change desired language when pasting.
 */


export function showTemplatePopupInEditor(editor: Editor, template: ?EmailTemplate, highlightedText: string) {
	const initialSearchString = template ? TEMPLATE_SHORTCUT_PREFIX + template.tag : highlightedText
	const cursorRect = editor.getCursorPosition()
	const editorRect = editor.getDOM().getBoundingClientRect();
	const onSelect = (text) => {
		editor.insertHTML(text)
		editor.focus()
	}

	let rect
	const availableHeightBelowCursor = window.innerHeight - cursorRect.bottom
	const popUpHeight = TEMPLATE_POPUP_HEIGHT + 10 // height + 10px offset for space from the bottom of the screen

	// By default the popup is shown below the cursor. If there is not enough space move the popup above the cursor
	const popUpWidth = editorRect.right - editorRect.left;
	if (availableHeightBelowCursor < popUpHeight) {
		const diff = popUpHeight - availableHeightBelowCursor
		rect = new DomRectReadOnlyPolyfilled(editorRect.left, cursorRect.bottom - diff, popUpWidth, cursorRect.height);
	} else {
		rect = new DomRectReadOnlyPolyfilled(editorRect.left, cursorRect.bottom, popUpWidth, cursorRect.height);
	}
	locator.templateModel.getInitializedModel().then(() => {
		const popup = new TemplatePopup(locator.templateModel, rect, onSelect, initialSearchString)
		locator.templateModel.search(initialSearchString)
		popup.show()
	})
}

export class TemplatePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_addTemplateButtonAttrs: ButtonAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement
	_onSelect: (string) => void
	_initialWindowWidth: number
	_resizeListener: windowSizeListener
	_redrawStream: Stream<*>
	_templateModel: TemplateModel
	_searchBarValue: Stream<string>
	_selectTemplateButtonAttrs: ButtonAttrs
	_inputDom: HTMLElement

	constructor(templateModel: TemplateModel, rect: PosRect, onSelect: (string) => void, initialSearchString: string) {
		this._rect = rect
		this._onSelect = onSelect
		this._initialWindowWidth = window.innerWidth
		this._resizeListener = () => {
			this._close()
		}
		this._searchBarValue = stream(initialSearchString)
		this._templateModel = templateModel

		this._shortcuts = [
			{
				key: Keys.ESC,
				enabled: () => true,
				exec: () => {
					this._onSelect("")
					this._close()
					m.redraw()
				},
				help: "closeTemplate_action"
			},
			{
				key: Keys.RETURN,
				enabled: () => true,
				exec: () => {
					const selectedContent = this._templateModel.getSelectedContent()
					if (selectedContent) {
						this._onSelect(selectedContent.text)
						this._close()
					}
				},
				help: "insertTemplate_action"
			},
		]
		this._redrawStream = templateModel.getSearchResults().map((results) => {
			m.redraw()
		})

		this._selectTemplateButtonAttrs = {
			label: "selectTemplate_action",
			click: () => {
				const selected = this._templateModel.getSelectedContent()
				if (selected) {
					this._onSelect(selected.text)
					this._close()
				}
			},
			type: ButtonType.Primary,
		}
		templateModel.search(initialSearchString)


	}

	view: () => Children = () => {
		const showTwoColumns = this._isScreenWideEnough()

		return m(".flex.flex-column.abs.elevated-bg.border-radius.dropdown-shadow", { // Main Wrapper
				style: {
					width: px(this._rect.width),
					height: px(TEMPLATE_POPUP_HEIGHT),
					top: px(this._rect.top),
					left: px(this._rect.left)
				},
				onclick: (e) => {
					this._inputDom.focus()
					e.stopPropagation()
				},
				oncreate: () => {
					windowFacade.addResizeListener(this._resizeListener)
				},
				onremove: () => {
					windowFacade.removeResizeListener(this._resizeListener)
				},
			}, [
				this._renderHeader(),
				m(".flex.flex-grow.scroll.mb-s", [
					m(".flex.flex-column.scroll" + (showTwoColumns ? ".pr" : ""), {
						style: {
							flex: '1 1 40%'
						},
						oncreate: (vnode) => this._scrollDom = vnode.dom
					}, this._renderLeftColumn()),
					showTwoColumns ? m(".flex.flex-column.flex-grow-shrink-half", {style: {flex: '1 1 60%'}}, this._renderRightColumn()) : null,
				])
			],
		)
	}

	_renderHeader(): Children {
		const selectedTemplate = this._templateModel.getSelectedTemplate()
		return m(".flex-space-between.center-vertically.pl.pr-s", [
			m(".flex-start", [
				m(".flex.center-vertically", this._renderSearchBar()),
				this._renderAddButton(),
			]),
			m(".flex-end", [
				selectedTemplate
					? this._renderEditButtons(selectedTemplate) // Right header wrapper
					: null,
			])
		])
	}

	_renderSearchBar: (() => Children) = () => {
		return m(TemplateSearchBar, {
			value: this._searchBarValue,
			placeholder: "filter_label",
			keyHandler: (keyPress) => {
				if (isKeyPressed(keyPress.keyCode, Keys.DOWN, Keys.UP)) {
					this._templateModel.selectNextTemplate(isKeyPressed(keyPress.keyCode, Keys.UP)
						? SELECT_PREV_TEMPLATE
						: SELECT_NEXT_TEMPLATE)

					const scrollWindowHeight = this._scrollDom.getBoundingClientRect().height
					const scrollOffset = this._scrollDom.scrollTop

					// Actual position in the list
					const selectedTop = TEMPLATE_LIST_ENTRY_HEIGHT * this._templateModel.getSelectedTemplateIndex()
					const selectedBottom = selectedTop + TEMPLATE_LIST_ENTRY_HEIGHT

					// Relative to the top of the scroll window
					const selectedRelativeTop = selectedTop - scrollOffset
					const selectedRelativeBottom = selectedBottom - scrollOffset

					// clamp the selected item to stay between the top and bottom of the scroll window
					if (selectedRelativeTop < 0) {
						this._scrollDom.scrollTop = selectedTop
					} else if (selectedRelativeBottom > scrollWindowHeight) {
						this._scrollDom.scrollTop = selectedBottom - scrollWindowHeight
					}
					return true
				} else {
					return false
				}
			},
			oninput: (value) => {
				this._templateModel.search(value)
			},
			oncreate: (vnode) => {
				this._inputDom = vnode.dom.firstElementChild // firstElementChild is the input field of the input wrapper
			}
		})
	}

	_renderAddButton(): Children {
		return m("", {
			onkeydown: (e) => {
				// prevents tabbing into the background of the modal
				if (isKeyPressed(e.keyCode, Keys.TAB) && !this._templateModel.getSelectedTemplate()) {
					this._inputDom.focus()
					e.preventDefault()
				}
			}

		}, m(ButtonN, this._createAddButtonAttributes()))
	}

	_createAddButtonAttributes(): ButtonAttrs {
		const templateGroupInstances = locator.templateGroupModel.getGroupInstances()
		if (templateGroupInstances.length === 1) {
			return {
				label: "createTemplate_action",
				click: () => {
					import("../../settings/TemplateEditor").then(editor => {
						editor.showTemplateEditor(null, templateGroupInstances[0].groupRoot)
					})
				},
				type: ButtonType.ActionLarge,
				icon: () => Icons.Add,
				colors: ButtonColors.DrawerNav
			}
		} else {
			return attachDropdown({
				label: "createTemplate_action",
				click: noOp,
				type: ButtonType.ActionLarge,
				icon: () => Icons.Add,
				colors: ButtonColors.DrawerNav
			}, () => templateGroupInstances.map(groupInstances => {
				return {
					label: () => groupInstances.groupInfo.name,
					click: () => {
						import("../../settings/TemplateEditor").then(editor => {
							editor.showTemplateEditor(null, groupInstances.groupRoot)
						})
					},
					type: ButtonType.Dropdown,
				}
			}))
		}
	}


	_renderEditButtons(selectedTemplate: EmailTemplate): Children {
		const selectedContent = this._templateModel.getSelectedContent()
		return [
			m(ButtonN, attachDropdown({
					label: () => selectedContent ? selectedContent.languageCode + ' ▼' : "",
					title: "chooseLanguage_action",
					// Use dropdown as button type because it matches with the colors of the other buttons
					type: ButtonType.Dropdown,
					click: noOp,
					noBubble: true,
				}, () => selectedTemplate.contents.map(content => {
					return {
						label: () => lang.get(languageByCode[downcast(content.languageCode)].textId),
						type: ButtonType.Dropdown,
						click: (e) => {
							e.stopPropagation()
							this._templateModel.setSelectedContent(content)
							this._inputDom.focus()
						},
					}
				}
				)
			)),
			m(ButtonN, {
				label: "editTemplate_action",
				click: () => {
					locator.entityClient.load(TemplateGroupRootTypeRef, neverNull(selectedTemplate._ownerGroup)).then(groupRoot => {
						import("../../settings/TemplateEditor").then(editor => {
							editor.showTemplateEditor(selectedTemplate, groupRoot)
						})
					})
				},
				type: ButtonType.ActionLarge,
				icon: () => Icons.Edit,
				colors: ButtonColors.DrawerNav,
			}),
			m(ButtonN, {
				label: "remove_action",
				click: () => {
					Dialog.confirm("deleteTemplate_msg").then((confirmed) => {
						if (confirmed) {
							locator.entityClient.erase(selectedTemplate)
						}
					})
				},
				type: ButtonType.ActionLarge,
				icon: () => Icons.Trash,
				colors: ButtonColors.DrawerNav,
			}),
			m(".pr-s", m(".nav-bar-spacer")),
			m("", {
				onkeydown: (e) => {
					// prevents tabbing into the background of the modal
					if (isKeyPressed(e.keyCode, Keys.TAB)) {
						this._inputDom.focus()
						e.preventDefault()
					}
				}
			}, m(ButtonN, this._selectTemplateButtonAttrs)),
		]
	}

	_renderLeftColumn(): Children {
		return m(".flex.flex-column",
			this._templateModel.containsResult()
				? m(".templates-search-results", this._templateModel.getSearchResults()()
				                                     .map((template, index) => this._renderTemplateListRow(template)))
				: m(".row-selected.text-center.pt",
				lang.get(this._templateModel.hasLoaded()
					? "nothingFound_label"
					: "loadingTemplates_label"))
		)
	}

	_renderTemplateListRow: (EmailTemplate) => Children = (template: EmailTemplate) => {
		return m(".flex.flex-column.click", {
				style: {
					maxWidth: this._isScreenWideEnough() ? px(TEMPLATE_LIST_ENTRY_WIDTH) : px(this._rect.width - 20), // subtract 20px because of padding left and right
					// backgroundColor: (index % 2) ? theme.list_bg : theme.list_alternate_bg
				}
			}, [
				m(".flex.template-list-row" + (this._templateModel.isSelectedTemplate(template) ? ".row-selected" : ""),
					{
						onclick: (e) => {
							this._templateModel.setSelectedTemplate(template)
							this._inputDom.focus()
							e.stopPropagation()
						},
						ondblclick: (e) => {
							this._templateModel.setSelectedTemplate(template)
							const selected = this._templateModel.getSelectedContent()
							if (selected) {
								this._onSelect(selected.text)
								this._close()
							}
						}
					}, [
						m(TemplatePopupResultRow, {template: template}),
						this._templateModel.isSelectedTemplate(template) ? m(Icon, {
							icon: Icons.ArrowForward,
							style: {marginTop: "auto", marginBottom: "auto"}
						}) : m("", {style: {width: "17.1px", height: "16px"}}),
					]
				)
			]
		)
	}

	_renderRightColumn(): Children {
		const template = this._templateModel.getSelectedTemplate()
		if (template) {
			return [
				m(TemplateExpander, {
					template: template,
					model: this._templateModel,
				})
			]
		} else {
			return null
		}
	}

	_isScreenWideEnough(): boolean {
		return window.innerWidth > (TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH)
	}

	_getWindowWidthChange(): number {
		return window.innerWidth - this._initialWindowWidth
	}

	show() {
		modal.display(this, false)
	}

	_close(): void {
		modal.remove(this)
	}

	backgroundClick(e: MouseEvent): void {
		this._onSelect("")
		this._close()
	}

	hideAnimation(): Promise<void> {
		return Promise.resolve()
	}

	onClose(): void {
		this._redrawStream.end(true)
	}

	shortcuts(): Shortcut[] {
		return this._shortcuts
	}

	popState(e: Event): boolean {
		return true
	}
}