// @flow

import m from "mithril"
import type {NavButtonAttrs} from "../gui/base/NavButtonN"
import {isNavButtonSelected, NavButtonN} from "../gui/base/NavButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN} from "../gui/base/ButtonN"
import {size} from "../gui/size"

export type SettingsFolderRowAttrs = {
	mainButtonAttrs: NavButtonAttrs,
	extraButtonAttrs?: ?ButtonAttrs,
	smallText?: ?string
}

export class SettingsFolderRow implements MComponent<SettingsFolderRowAttrs> {

	navButtonDom: HTMLElement

	view(vnode: Vnode<SettingsFolderRowAttrs>): Children {
		const {mainButtonAttrs, extraButtonAttrs, smallText} = vnode.attrs
		const selector = `.folder-row.flex-start.pr-l.pl-m${isNavButtonSelected(mainButtonAttrs) ? ".row-selected" : ""}`
		return m(selector, [
			m(".flex-v-center.flex-grow.button-height.pb-s", [
				m(NavButtonN, mainButtonAttrs),
				smallText
					? m("small.text-ellipsis", {
						style: {
							// align the small text with navbutton label
							"padding-left": `${size.icon_size_large + size.hpad_button + size.hpad}px`
						}
					}, smallText)
					: null
			]),
			extraButtonAttrs ? m(ButtonN, extraButtonAttrs) : null
		])
	}
}

