// @flow

import type {Parser} from "./parserCombinator"
import {
	makeAnyParser,
	makeCharacterParser,
	makeNotOneOfCharactersParser,
	makeOneOrMoreParser,
	makeSeparatedByParser,
	mapParser,
	ParserError,
	StringIterator
} from "./parserCombinator"
import {neverNull} from "../../api/common/utils/Utils"

type ParsedCsv = {
	rows: Array<Array<string>>
}

type CsvParseOptions = {
	delimiter: Delimiter,
}

type Delimiter = "," | "|" | ":" | ";"

const DEFAULT_CSV_PARSE_OPTIONS = {
	delimiter: ",",
}

export function parseCsv(input: string, options?: $Shape<CsvParseOptions>): ParsedCsv {
	const {delimiter} = Object.assign({}, DEFAULT_CSV_PARSE_OPTIONS, options)


	const lineDelimiterParser = makeCharacterParser("\n")
	const parser = makeSeparatedByParser(lineDelimiterParser, makeRowParser(delimiter))
	const rows = parser(new StringIterator(input.replace(/\r\n/g, "\n")))
	return {rows: rows}
}

function makeRowParser(delimiter: string): Parser<Array<string>> {
	return makeSeparatedByParser(makeCharacterParser(delimiter), makeColumnParser(delimiter))
}

function makeColumnParser(delimiter: string): Parser<string> {
	return makeAnyParser(makeEmptyColumnParser(delimiter), makeTrimSpacesParser(quotedColumnParser), makeUnquotedColumnParser(delimiter))
}

/**
 * Parse an empty column, ie. the next character is the delimiter, so we return an empty string and the iterator remains unchanged
 * @param delimiter
 * @returns {function(StringIterator): (string|undefined)}
 */
function makeEmptyColumnParser(delimiter: string): Parser<string> {
	return (iterator: StringIterator) => {
		const {done, value} = iterator.next()

		if (done) {
			return ""
		}

		if (value === delimiter) {
			iterator.position -= 1
			return ""
		} else {
			throw new ParserError("not an empty column")
		}
	}
}

/**
 * Parse a column that is nonempty, doesn't contain any quotes, newlines, or delimiters
 * @param delimiter
 * @returns {Parser<*>}
 */
function makeUnquotedColumnParser(delimiter: string): Parser<string> {
	// We don't use trim spaces parser because it won't remove trailing spaces in this case
	return mapParser(makeOneOrMoreParser(makeNotOneOfCharactersParser(['"', '\n', delimiter])), arr => arr.join("").trim())
}


/**
 * Parse the inside of a double-quote quoted string, returning the string without the outer double-quotes
 * double-quotes inside must be escaped as a doubled double-quote. Any doubled double-quotes will returned in the result as a single double-quote, comprende?
 * @param iterator
 */
function quotedColumnParser(iterator: StringIterator): string {
	const initial = iterator.next()
	if (initial.done || initial.value !== '"') {
		throw new ParserError("expected quote")
	}

	let result = ""

	while (true) {
		let {done, value} = iterator.next()

		if (done) {
			throw new ParserError("unexpected end of input")
		}

		if (value === '"') {
			// We will either be at an escaped quote, or at the end of the string
			if (iterator.peek() === '"') {
				// It's escaped, append only a single quote to the result
				iterator.next()
				result += '"'
			} else {
				// it's not escaped, so it's the final delimiter
				break
			}
		} else {
			// Flow should know that value isn't null here, oh well
			result += neverNull(value)
		}
	}

	return result
}

function makeTrimSpacesParser(parser: Parser<string>): Parser<string> {
	return function (iterator: StringIterator) {
		while (iterator.peek() === "") {
			iterator.next()
		}

		const result = parser(iterator)

		while (iterator.peek() === "") {
			iterator.next()
		}

		return result
	}
}
