//@flow
import m from "mithril"
import type {Country} from "../../api/common/CountryList"
import {Countries} from "../../api/common/CountryList"
import {DropDownSelector} from "./DropDownSelector"
import type {TranslationKey} from "../../misc/LanguageViewModel"
import {lang} from "../../misc/LanguageViewModel"
import {ButtonColors, ButtonN, ButtonType} from "./ButtonN"
import {Icons} from "./icons/Icons"
import type {DropdownChildAttrs} from "./DropdownN"
import {attachDropdown} from "./DropdownN"
import type {MaybeLazy} from "../../api/common/utils/Utils"
import {mapLazily, noOp} from "../../api/common/utils/Utils"
import {promiseMap} from "../../api/common/utils/PromiseUtils"

// TODO Use DropDownSelectorN
export function createCountryDropdown(selectedCountry: Stream<?Country>, helpLabel?: lazy<string>, label: TranslationKey | lazy<string> = "invoiceCountry_label"): DropDownSelector<?Country> {
	const countries = Countries.map(c => ({value: c, name: c.n}))
	countries.push({value: null, name: lang.get("choose_label")});

	const countryInput = new DropDownSelector(
		label,
		helpLabel,
		countries,
		selectedCountry,
		250).setSelectionChangedHandler(value => {
		selectedCountry(value)
	})
	return countryInput
}

export function moreButton(lazyChildren: MaybeLazy<$Promisable<$ReadOnlyArray<DropdownChildAttrs>>>): Children {
	return m(ButtonN, attachDropdown({
		label: "more_label",
		colors: ButtonColors.Nav,
		click: noOp,
		icon: () => Icons.More
	}, mapLazily(lazyChildren, children => promiseMap(children,
		child => typeof child === "string"
			? child
			// If type hasn't been bound on the child it get's set to Dropdown, otherwise we use what is already there
			: Object.assign({}, {type: ButtonType.Dropdown}, child))
	)))
}