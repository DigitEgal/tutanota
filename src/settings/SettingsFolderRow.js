// @flow

import m from "mithril"
import type {NavButtonAttrs} from "../gui/base/NavButtonN"
import {isNavButtonSelected, NavButtonN} from "../gui/base/NavButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN} from "../gui/base/ButtonN"

export type SettingsFolderRowAttrs = {
	mainButtonAttrs: NavButtonAttrs,
	extraButtonAttrs?: ?ButtonAttrs,
	smallText?: ?string
}

export class SettingsFolderRow implements MComponent<SettingsFolderRowAttrs> {

	view(vnode: Vnode<SettingsFolderRowAttrs>): Children {
		const {mainButtonAttrs, extraButtonAttrs, smallText} = vnode.attrs
		const selector = `.folder-row.flex-start.plr-l${isNavButtonSelected(mainButtonAttrs) ? ".row-selected" : ""}`
		return m(selector, [
			m(NavButtonN, mainButtonAttrs),
			extraButtonAttrs ? m(ButtonN, extraButtonAttrs) : null
		])
	}
}

