// @flow

import type {Parser} from "./parserCombinator"
import {
	makeAnyParser,
	makeCharacterParser,
	makeCharactersParser,
	makeEitherParser,
	makeNotParser,
	makeOneOrMoreParser,
	makeSeparatedByParser,
	mapParser,
	StringIterator
} from "./parserCombinator"
import {ParsingError} from "../../api/common/error/ParsingError"
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

	const parser = makeSeparatedByParser(makeEitherParser(makeCharacterParser("\r\n"), makeCharacterParser("\n")), makeRowParser(delimiter))
	return {rows: parser(new StringIterator(input))}
}

function makeRowParser(delimiter: string): Parser<Array<string>> {
	return makeSeparatedByParser(makeCharacterParser(delimiter), makeColumnParser(delimiter))
}

function makeColumnParser(delimiter: string): Parser<string> {
	return makeAnyParser(makeEmptyColumnParser(delimiter), makeUnquotedColumnParser(delimiter), quotedColumnParser)
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

		iterator.position -= 1

		if (value === delimiter) {
			return ""
		} else {
			throw new ParsingError("not an empty column")
		}
	}
}

/**
 * Parse a column that is nonempty, doesn't contain any quotes, newlines, or delimiters
 * @param delimiter
 * @returns {Parser<*>}
 */
function makeUnquotedColumnParser(delimiter: string): Parser<string> {
	return mapParser(makeOneOrMoreParser(makeNotParser(makeCharactersParser('"', '\n', '\r\n', delimiter))), arr => arr.join(""))
}


/**
 * Parse the inside of a double-quote quoted string, returning the string without the outer double-quotes
 * double-quotes inside must be escaped as a doubled double-quote. Any doubled double-quotes will returned in the result as a single double-quote, comprende?
 * @param iterator
 */
function quotedColumnParser(iterator: StringIterator): string {
	const initial = iterator.next()
	if (initial.done || initial.value === '"') {
		throw new ParsingError("expected quote")
	}

	let result = ""

	while (true) {
		let {done, value} = iterator.next()

		if (done) {
			throw new ParsingError("unexpected end of input")
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
