var assert = require('assert');
var didjs = require('./index.js')

describe('isReference', function() {

    it('should return false if no path or fragment', function() {
        var did = {method: 'example', id: '123'}
        assert.equal(didjs.utils.isReference(did), false);
    });

    it('should return true if path', function() {
        var did = {method: 'example', id: '123', path:'a/b'}
        assert.equal(didjs.utils.isReference(did), true);
    });

    it('should return true if pathSegments', function() {
        var did = {method: 'example', id: '123', pathSegments:['a','b']}
        assert.equal(didjs.utils.isReference(did), true);
    });

    it('should return true if fragment', function() {
        var did = {method: 'example', id: '123', fragment:'#keys-1'}
        assert.equal(didjs.utils.isReference(did), true);
    });

    it('should return true if path and fragment', function() {
        var did = {method: 'example', id: '123', path:'a/b', fragment:'#keys-1'}
        assert.equal(didjs.utils.isReference(did), true);
    });

})

describe('stringifyTest', function() {

    it('assembles a DID', function() {
        var did = {method: 'example', id: '123'}
        assert.equal('did:example:123', didjs.stringify(did));
    });

    it('assembles a DID from idStrings', function() {
        var did = {method: 'example', idStrings: ['123','456']}
        assert.equal('did:example:123:456', didjs.stringify(did));
    });

    it('returns empty string if no method', function() {
        var did = {id:'123'}
        assert.equal('', didjs.stringify(did));
    });

    it('returns empty string in no id or idStrings', function() {
        var did = {method:'example'}
        assert.equal('', didjs.stringify(did));
    });

    it('includes path', function() {
        var did = {id:'123', method:'example', path:'a/b'}
        assert.equal('did:example:123/a/b', didjs.stringify(did));
    });

    it('includes path assembled from pathSegments', function() {
        var did = {id:'123', method:'example', pathSegments:['a','b']}
        assert.equal('did:example:123/a/b', didjs.stringify(did));
    });

    it('includes fragment', function() {
        var did = {id:'123', method:'example', fragment:'keys-1'}
        assert.equal('did:example:123#keys-1', didjs.stringify(did));
    });

    it('does not include fragment if path is present', function() {
        var did = {id:'123', method:'example', fragment:'keys-1', path:'a/b'}
        assert.equal('did:example:123/a/b', didjs.stringify(did));
    });

    it('does not include fragment if pathSegemnts is present', function() {
        var did = {id:'123', method:'example', fragment:'keys-1', pathSegments:['a','b']}
        assert.equal('did:example:123/a/b', didjs.stringify(did));
    });

})

describe('parseTest', function() {

    it('throws error if input is empty', function() {
        assert.throws(function(){didjs.parse('')}, Error);
    });

    it('returns error if input length is less than length 7', function() {
		assert.throws(function(){didjs.parse('did:')}, Error);
        assert.throws(function(){didjs.parse('did:a')}, Error);
        assert.throws(function(){didjs.parse('did:a:')}, Error);
    })
    
    it('returns error if input does not have a second : to mark end of method', function() {
		assert.throws(function(){didjs.parse('did:aaaaaaaaaaa')}, Error);
    })
    
    it('returns error if method is empty', function() {
		assert.throws(function(){didjs.parse('did::aaaaaaaaaaa')}, Error);
    })
    
    it('returns error if idstring is empty', function() {
		var dids = [
			"did:a::123:456",
			"did:a:123::456",
			"did:a:123:456:",
			"did:a:123:/abc",
			"did:a:123:#abc",
        ]
		for (var i=0; i<dids.length; i++) {
            assert.throws(function(){didjs.parse(dids[i])}, Error)
        }
    })
    
    it('returns error if input does not begin with did: scheme', function() {
		assert.throws(function(){didjs.parse('a:12345')}, Error);
    })

    it('succeeds if it has did prefix and length is greater than 7', function() {
        assert.deepEqual(didjs.parse('did:a:1'), {
            method: 'a',
            idStrings: [ '1' ],
            id: '1',
            pathSegments: [],
            path: ''
        });
    })

    it('succeeds to extract method', function() {
        assert.equal(didjs.parse('did:a:1').method, 'a');
    })

    it('returns error if method has any other char than 0-9 or a-z', function() {
        assert.throws(function(){didjs.parse('did:aA:1')}, Error);
    })
    
    it('succeeds to extract id', function() {
        assert.equal(didjs.parse('did:a:1').id, '1');
    })

    it('succeeds to extract id parts', function() {
        const did = didjs.parse('did:a:123:456')
        assert.equal(did.idStrings[0], '123');
        assert.equal(did.idStrings[1], '456');
    })

    it('returns error if ID has an invalid char', function() {
        assert.throws(function(){didjs.parse('did:a:1&&111')}, Error);
    })

    it('succeeds to extract path', function() {
        assert.equal(didjs.parse('did:a:123:456/someService').path, 'someService');
    })

    it('succeeds to extract path segments', function() {
        const did = didjs.parse('did:a:123:456/a/b')
        assert.equal(did.pathSegments[0], 'a');
        assert.equal(did.pathSegments[1], 'b');
    })

    it('succeeds with percent encoded chars in path', function() {
        assert.equal(didjs.parse('did:a:123:456/a/%20a').path, 'a/%20a');
    })

    it('returns error if % in path is not followed by 2 hex chars', function() {
		var dids = [
			"did:a:123:456/%",
			"did:a:123:456/%a",
			"did:a:123:456/%!*",
			"did:a:123:456/%A!",
			"did:xyz:pqr#%A!",
			"did:a:123:456/%A%",
        ]
		for (var i=0; i<dids.length; i++) {
            assert.throws(function(){didjs.parse(dids[i])}, Error)
        }
    })

    it('returns error if path is empty but there is a slash', function() {
        assert.throws(function(){didjs.parse('did:a:123:456/')}, Error);
    })

    it('returns error if first path segment is empty', function() {
        assert.throws(function(){didjs.parse('did:a:123:456//abc')}, Error);
    })

    it('does not fail if second path segment is empty', function() {
        assert.doesNotThrow(function(){didjs.parse('did:a:123:456/abc//pqr')}, Error);
    })

    it('returns error if path has invalid char', function() {
        assert.throws(function(){didjs.parse('did:a:123:456/ssss^sss')}, Error);
    })

    it('does not fail if path has at least one segment and a trailing slash', function() {
        assert.doesNotThrow(function(){didjs.parse('did:a:123:456/a/b/')}, Error);
    })

    it('succeeds to extract fragment', function() {
        assert.equal(didjs.parse('did:a:123:456#keys-1').fragment, 'keys-1');
    })

    it('succeeds to extract fragment', function() {
        assert.equal(didjs.parse('did:a:123:456#aaaaaa%20a').fragment, 'aaaaaa%20a');
    })

    it('returns error if % in fragment is not followed by 2 hex chars', function() {
		var dids = [
			"did:xyz:pqr#%",
			"did:xyz:pqr#%a",
			"did:xyz:pqr#%!*",
			"did:xyz:pqr#%!A",
			"did:xyz:pqr#%A!",
			"did:xyz:pqr#%A%",
        ]
		for (var i=0; i<dids.length; i++) {
            assert.throws(function(){didjs.parse(dids[i])}, Error)
        }
    })

    it('fails if fragment has invalid char', function() {
        assert.throws(function(){didjs.parse('did:a:123:456#ssss^sss')}, Error);
    })

})

describe('utilsTest', function() {

})

describe('utils test', function() {

    it('tests isNotValidIDChar', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        '.', '-']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidIDChar(valid[i]), false)
        }
        var notvalid = ['%', '^', '#', ' ', '_', '~', '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=', ':', '@', '/', '?']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidIDChar(notvalid[i]), true)
        }
    })

    it('tests isNotValidFragmentChar', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'-', '.', '_', '~', '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=',
		':', '@',
        '/', '?']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidFragmentChar(valid[i]), false)
        }
        var notvalid = ['%', '^', '#', ' ']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidFragmentChar(notvalid[i]), true)
        }
    })

    it('tests isNotValidPathChar', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'-', '.', '_', '~', '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=',
		':', '@']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidPathChar(valid[i]), false)
        }
        var notvalid = ['%', '/', '?']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotValidPathChar(notvalid[i]), true)
        }
    })

    it('tests isNotUnreservedOrSubdelim', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'-', '.', '_', '~', '!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '=']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotUnreservedOrSubdelim(valid[i]), false)
        }
        var notvalid = ['%', ':', '@', '/', '?']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotUnreservedOrSubdelim(notvalid[i]), true)
        }
    })

    it('tests isNotHexDigit', function() {
        var valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotHexDigit(valid[i]), false)
        }
        var notvalid = ['G', 'g', '%', '\x40', '\x47', '\x60', '\x67']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotHexDigit(notvalid[i]), true)
        }
    })

    it('tests isNotDigit', function() {
        var valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotDigit(valid[i]), false)
        }
        var notvalid = ['A', 'a', '\x29', '\x40', '/']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotDigit(notvalid[i]), true)
        }
    })

    it('tests isNotAlpha', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotAlpha(valid[i]), false)
        }
        var notvalid = ['\x40', '\x5B', '\x60', '\x7B', '0', '9', '-', '%']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotAlpha(notvalid[i]), true)
        }
    })

    it('tests isNotBigLetter', function() {
        var valid = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
		'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotBigLetter(valid[i]), false)
        }
        var notvalid = ['\x40', '\x5B', 'a', 'z', '1', '9', '-', '%']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotBigLetter(notvalid[i]), true)
        }
    })

    it('tests isNotSmallLetter', function() {
        var valid = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
		'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
        for (var i=0; i<valid.length; i++) {
            assert.strictEqual(didjs.utils.isNotSmallLetter(valid[i]), false)
        }
        var notvalid = ['\x60', '\x7B', 'A', 'Z', '1', '9', '-', '%']
        for (var i=0; i<notvalid.length; i++) {
            assert.strictEqual(didjs.utils.isNotSmallLetter(notvalid[i]), true)
        }
    })

})