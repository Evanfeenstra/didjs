function stringify(d){
    // write the did: prefix
    var str = "did:"

    if (d.method) {
        // write method followed by a `:`
        str += d.method
        str += ':'
    } else {
        // if there is no Method, return an empty string
        return ''
    }

    if (d.id) {
        str += d.id
    } else if (d.idStrings && d.idStrings.length > 0) {
        // join idStrings on colon to make the ID
        str += d.idStrings.join(':')
    } else {
        // if there is no id, return an empty string
        return ''
    }

    if (d.path) {
        // write a leading / and then Path
        str += '/'
        str += d.path
    } else if (d.pathSegments && d.pathSegments.length > 0) {
        // write a leading / and then PathSegments joined with / between them
        str += '/'
        str += d.pathSegments.join('/')
    } else {
        // add fragment only when there is no path
        if (d.fragment) {
            str += '#'
            str += d.fragment
        }
    }

    return str
}

function parse(input){
    // the parser state machine is implemented as a loop over parser steps
    // steps increment currentIndex as they consume the input, each step returns the next step to run
    // the state machine halts when one of the steps returns 'done'
    try {
        var did = {}
        var step = checkLength
        while (!did.done) {
            did = step(input)
        }
        return did.out
    } catch(e) {
        throw e
    }
}

function checkLength(input) {
    if (input.length < 7) {
        throw new Error('input length is less than 7: ' + input.length)
    }
    return parseScheme(input)
}

function parseScheme(input) {
    var d = {
        input: input, 
        currentIndex: 3,
        out: {}
    }
    // the grammar requires `did:` prefix
    if (d.input.substring(0,d.currentIndex+1) !== 'did:') {
        throw new Error('input does not begin with did: prefix')
    }
    return parseMethod(d)
}

// extracts the DID Method
function parseMethod(d) {
    var currentIndex = d.currentIndex + 1
    var startIndex = currentIndex

    // parse method name
    // loop over every byte following the ':' in 'did:' unlil the second ':'
    // method is the string between the two ':'s
    while (true) {
        if (currentIndex === d.input.length) {
            // we got to the end of the input and didn't find a second ':'
            throw new Error('input does not have a second : marking end of method name')
        }

        // read the input character at currentIndex
        var char = d.input[currentIndex]

        if (char === ':') {
            // we've found the second : in the input that marks the end of the method
            if (currentIndex == startIndex) {
                // return error is method is empty, ex- did::1234
                throw new Error('method is empty')
            }
            break
        }

        // as per the grammar method can only be made of digits 0-9 or small letters a-z
        if (utils.isNotDigit(char) && utils.isNotSmallLetter(char)) {
            throw new Error('character is not a-z OR 0-9')
        }

        // move to the next char
        currentIndex = currentIndex + 1
    }

    // set parser state
    d.currentIndex = currentIndex
    d.out.method = d.input.substring(startIndex,currentIndex)

    // method is followed by specific-idstring, parse that next
    return parseID(d)
}

// extracts : separated idstrings that are part of a specific-idstring
// and adds them to out.IDStrings (later concatenated)
function parseID(d) {
    var currentIndex = d.currentIndex + 1
    var startIndex = currentIndex

    var next

    while (true) {
        if (currentIndex === d.input.length) {
            // we've reached end of input, no next state
            next = finish
            break
        }

        var char = d.input[currentIndex]

        if (char === ':') {
            // encountered : input may have another idstring, parse ID again
            next = parseID
            break
        }

        if (char === '/') {
            // encountered / input may have a path following specific-idstring, parse that next
            next = parsePath
            break
        }

        if (char === '#') {
            // encountered # input may have a fragment following specific-idstring, parse that next
            next = parseFragment
            break
        }

        // make sure current char is a valid idchar
        // idchar = ALPHA / DIGIT / "." / "-"
        if (utils.isNotValidIDChar(char)) {
            throw new Error('byte is not ALPHA OR DIGIT OR . OR -')
        }

        // move to the next char
        currentIndex = currentIndex + 1
    }

    if (currentIndex === startIndex){
        // idstring length is zero
        // from the grammar:
        //   idstring = 1*idchar
        // return error because idstring is empty, ex- did:a::123:456
        throw new Error('idstring must be atleast one char long')
    }

    // set parser state
    d.currentIndex = currentIndex
    d.out.idStrings = d.out.idStrings || []
    d.out.idStrings = d.out.idStrings.concat(d.input.substring(startIndex,currentIndex))

    // return the next parser step
    return next(d)
}

// extracts a DID Path from a DID Reference
function parsePath(d) {
    var currentIndex = d.currentIndex + 1
    var startIndex = currentIndex

    var indexIncrement
    var percentEncoded

    var next

    while (true) {
        if (currentIndex === d.input.length) {
            next = finish
            break
        }

        var char = d.input[currentIndex]

        if (char === '/') {
            // encountered / input may have another path segment, try to parse that next
            next = parsePath
            break
        }

        if (char === '%') {
            // a % must be followed by 2 hex digits
            if ((currentIndex+2 >= d.input.length) ||
                utils.isNotHexDigit(d.input[currentIndex+1]) ||
                utils.isNotHexDigit(d.input[currentIndex+2])) {
                throw new Error('%% is not followed by 2 hex digits')
            }
            // if we got here, we're dealing with percent encoded char, jump three chars
            percentEncoded = true
            indexIncrement = 3
        } else {
            // not pecent encoded
            percentEncoded = false
            indexIncrement = 1
        }

        // pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
        if (!percentEncoded && utils.isNotValidPathChar(char)) {
            throw new Error('character is not allowed in path')
        }

        // move to the next char
        currentIndex = currentIndex + indexIncrement
    }

    d.out.pathSegments = d.out.pathSegments || []
    if (currentIndex == startIndex && d.out.pathSegments.length === 0) {
        // path segment length is zero
        // first path segment must have atleast one character
        // from the grammar
        //   did-path = segment-nz *( "/" segment )
        throw new Error('first path segment must have atleast one character')
    }

    // update parser state
    d.currentIndex = currentIndex
    d.out.pathSegments = d.out.pathSegments.concat(d.input.substring(startIndex,currentIndex))
    
    return next(d)
}

// extracts a DID Fragment from a DID Reference
function parseFragment(d) {
    var currentIndex = d.currentIndex + 1
    var startIndex = currentIndex

    var indexIncrement
    var percentEncoded

    while (true) {
        if (currentIndex === d.input.length) {
            // we've reached the end of input
            // it's ok for reference to be empty, so we don't need a check for that
            // did-fragment = *( pchar / "/" / "?" )
            break
        }

        var char = d.input[currentIndex]

        if (char === '%') {
            // a % must be followed by 2 hex digits
            if ((currentIndex+2 >= d.input.length) ||
                utils.isNotHexDigit(d.input[currentIndex+1]) ||
                utils.isNotHexDigit(d.input[currentIndex+2])) {
                throw new Error('%% is not followed by 2 hex digits')
            }
            // if we got here, we're dealing with percent encoded char, jump three chars
            percentEncoded = true
            indexIncrement = 3
        } else {
            // not pecent encoded
            percentEncoded = false
            indexIncrement = 1
        }

        // did-fragment = *( pchar / "/" / "?" )
        // pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
        // utils.isNotValidFragmentChar checks for all othe valid chars except pct-encoded
        if (!percentEncoded && utils.isNotValidFragmentChar(char)) {
            throw new Error('character is not allowed in fragment ' + char)
        }

        // move to the next char
        currentIndex = currentIndex + indexIncrement
    }

    // update parser state
    d.currentIndex = currentIndex
    d.out.fragment = d.input.substring(startIndex,currentIndex)

    // no more parsing needed after a fragment,
    // cause the state machine to exit by returning nil
    return finish(d)
}

function finish(d){
    d.out.idStrings = d.out.idStrings || []
    d.out.id = d.out.idStrings.join(':')
    d.out.pathSegments = d.out.pathSegments || []
    d.out.path = d.out.pathSegments.join('/')
    d.done = true
    return d
}

var utils = {

    isReference: function(did){
        return (did.path || (did.pathSegments && did.pathSegments.length) || did.fragment) ? true : false
    },

    isNotValidIDChar: function(char) {
        return utils.isNotAlpha(char) && utils.isNotDigit(char) && char != '.' && char != '-'
    },

    // utils.isNotValidFragmentChar returns true if a byte is not allowed in a Fragment
    // from the grammar:
    //   did-fragment = *( pchar / "/" / "?" )
    //   pchar        = unreserved / pct-encoded / sub-delims / ":" / "@"
    // pct-encoded is not checked in this function
    isNotValidFragmentChar: function(char) {
        return utils.isNotValidPathChar(char) && char != '/' && char != '?'
    },

    // utils.isNotValidPathChar returns true if a byte is not allowed in Path
    //   did-path    = segment-nz *( "/" segment )
    //   segment     = *pchar
    //   segment-nz  = 1*pchar
    //   pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
    // pct-encoded is not checked in this function
    isNotValidPathChar: function(char) {
        return utils.isNotUnreservedOrSubdelim(char) && char != ':' && char != '@'
    },

    // utils.isNotUnreservedOrSubdelim returns true if a byte is not unreserved or sub-delims
    // from the grammar:
    //   unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
    //   sub-delims = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
    // https://tools.ietf.org/html/rfc3986#appendix-A
    isNotUnreservedOrSubdelim: function(char) {
        if (['-', '.', '_', '~', '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '='].includes(char)){
            return false
        } else {
            if (utils.isNotAlpha(char) && utils.isNotDigit(char)) {
                return true
            }
            return false
        }
    },

    // utils.isNotHexDigit returns true if a byte is not a digit between 0-9 or A-F or a-f
    // in US-ASCII http://www.columbia.edu/kermit/ascii.html
    // https://tools.ietf.org/html/rfc5234#appendix-B.1
    isNotHexDigit: function(char) {
        // '\x41' is A, '\x46' is F
        // '\x61' is a, '\x66' is f
        return utils.isNotDigit(char) && (char < '\x41' || char > '\x46') && (char < '\x61' || char > '\x66')
    },

    // utils.isNotDigit returns true if a byte is not a digit between 0-9
    // in US-ASCII http://www.columbia.edu/kermit/ascii.html
    // https://tools.ietf.org/html/rfc5234#appendix-B.1
    isNotDigit: function(char) {
        // '\x30' is digit 0, '\x39' is digit 9
        return (char < '\x30' || char > '\x39')
    },

    // utils.isNotAlpha returns true if a byte is not a big letter between A-Z or small letter between a-z
    // https://tools.ietf.org/html/rfc5234#appendix-B.1
    isNotAlpha: function(char) {
        return utils.isNotSmallLetter(char) && utils.isNotBigLetter(char)
    },

    // utils.isNotBigLetter returns true if a byte is not a big letter between A-Z
    // in US-ASCII http://www.columbia.edu/kermit/ascii.html
    // https://tools.ietf.org/html/rfc5234#appendix-B.1
    isNotBigLetter: function(char) {
        // '\x41' is big letter A, '\x5A' small letter Z
        return (char < '\x41' || char > '\x5A')
    },

    // utils.isNotSmallLetter returns true if a byte is not a small letter between a-z
    // in US-ASCII http://www.columbia.edu/kermit/ascii.html
    // https://tools.ietf.org/html/rfc5234#appendix-B.1
    isNotSmallLetter: function(char) {
        // '\x61' is small letter a, '\x7A' small letter z
        return (char < '\x61' || char > '\x7A')
    }
}

module.exports={
    parse, stringify, utils
}