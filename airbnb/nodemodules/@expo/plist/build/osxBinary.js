"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBuffer = exports.parseFile = exports.UID = exports.maxObjectCount = exports.maxObjectSize = void 0;
// adapted from https://github.com/3breadt/dd-plist
const fs_1 = __importDefault(require("fs"));
const debug = false;
exports.maxObjectSize = 100 * 1000 * 1000; // 100Meg
exports.maxObjectCount = 32768;
// EPOCH = new SimpleDateFormat("yyyy MM dd zzz").parse("2001 01 01 GMT").getTime();
// ...but that's annoying in a static initializer because it can throw exceptions, ick.
// So we just hardcode the correct value.
const EPOCH = 978307200000;
// UID object definition
class UID {
    constructor(UID) {
        this.UID = UID;
    }
}
exports.UID = UID;
async function parseFile(fileNameOrBuffer) {
    if (Buffer.isBuffer(fileNameOrBuffer)) {
        return exports.parseBuffer(fileNameOrBuffer);
    }
    const data = await fs_1.default.promises.readFile(fileNameOrBuffer);
    return exports.parseBuffer(data);
}
exports.parseFile = parseFile;
;
const parseBuffer = (buffer) => {
    // check header
    const header = buffer.slice(0, 'bplist'.length).toString('utf8');
    if (header !== 'bplist') {
        throw new Error("Invalid binary plist. Expected 'bplist' at offset 0.");
    }
    // Handle trailer, last 32 bytes of the file
    const trailer = buffer.slice(buffer.length - 32, buffer.length);
    // 6 null bytes (index 0 to 5)
    const offsetSize = trailer.readUInt8(6);
    if (debug) {
        console.log('offsetSize: ' + offsetSize);
    }
    const objectRefSize = trailer.readUInt8(7);
    if (debug) {
        console.log('objectRefSize: ' + objectRefSize);
    }
    const numObjects = readUInt64BE(trailer, 8);
    if (debug) {
        console.log('numObjects: ' + numObjects);
    }
    const topObject = readUInt64BE(trailer, 16);
    if (debug) {
        console.log('topObject: ' + topObject);
    }
    const offsetTableOffset = readUInt64BE(trailer, 24);
    if (debug) {
        console.log('offsetTableOffset: ' + offsetTableOffset);
    }
    if (numObjects > exports.maxObjectCount) {
        throw new Error('maxObjectCount exceeded');
    }
    // Handle offset table
    const offsetTable = [];
    for (let i = 0; i < numObjects; i++) {
        const offsetBytes = buffer.slice(offsetTableOffset + i * offsetSize, offsetTableOffset + (i + 1) * offsetSize);
        offsetTable[i] = readUInt(offsetBytes, 0);
        if (debug) {
            console.log('Offset for Object #' +
                i +
                ' is ' +
                offsetTable[i] +
                ' [' +
                offsetTable[i].toString(16) +
                ']');
        }
    }
    // Parses an object inside the currently parsed binary property list.
    // For the format specification check
    // <a href="https://www.opensource.apple.com/source/CF/CF-635/CFBinaryPList.c">
    // Apple's binary property list parser implementation</a>.
    function parseObject(tableOffset) {
        const offset = offsetTable[tableOffset];
        const type = buffer[offset];
        const objType = (type & 0xf0) >> 4; //First  4 bits
        const objInfo = type & 0x0f; //Second 4 bits
        switch (objType) {
            case 0x0:
                return parseSimple();
            case 0x1:
                return parseInteger();
            case 0x8:
                return parseUID();
            case 0x2:
                return parseReal();
            case 0x3:
                return parseDate();
            case 0x4:
                return parseData();
            case 0x5: // ASCII
                return parsePlistString();
            case 0x6: // UTF-16
                return parsePlistString(true);
            case 0xa:
                return parseArray();
            case 0xd:
                return parseDictionary();
            default:
                throw new Error('Unhandled type 0x' + objType.toString(16));
        }
        function parseSimple() {
            //Simple
            switch (objInfo) {
                case 0x0: // null
                    return null;
                case 0x8: // false
                    return false;
                case 0x9: // true
                    return true;
                case 0xf: // filler byte
                    return null;
                default:
                    throw new Error('Unhandled simple type 0x' + objType.toString(16));
            }
        }
        function bufferToHexString(buffer) {
            let str = '';
            let i;
            for (i = 0; i < buffer.length; i++) {
                if (buffer[i] != 0x00) {
                    break;
                }
            }
            for (; i < buffer.length; i++) {
                const part = '00' + buffer[i].toString(16);
                str += part.substr(part.length - 2);
            }
            return str;
        }
        function parseInteger() {
            const length = Math.pow(2, objInfo);
            if (length < exports.maxObjectSize) {
                const data = buffer.slice(offset + 1, offset + 1 + length);
                if (length === 16) {
                    const str = bufferToHexString(data);
                    return BigInt(str); // bigInt(str, 16);
                }
                return data.reduce((acc, curr) => {
                    acc <<= 8;
                    acc |= curr & 255;
                    return acc;
                });
            }
            else {
                throw new Error('Too little heap space available! Wanted to read ' +
                    length +
                    ' bytes, but only ' +
                    exports.maxObjectSize +
                    ' are available.');
            }
        }
        function parseUID() {
            const length = objInfo + 1;
            if (length < exports.maxObjectSize) {
                return new UID(readUInt(buffer.slice(offset + 1, offset + 1 + length)));
            }
            throw new Error('Too little heap space available! Wanted to read ' +
                length +
                ' bytes, but only ' +
                exports.maxObjectSize +
                ' are available.');
        }
        function parseReal() {
            const length = Math.pow(2, objInfo);
            if (length < exports.maxObjectSize) {
                const realBuffer = buffer.slice(offset + 1, offset + 1 + length);
                if (length === 4) {
                    return realBuffer.readFloatBE(0);
                }
                if (length === 8) {
                    return realBuffer.readDoubleBE(0);
                }
            }
            else {
                throw new Error('Too little heap space available! Wanted to read ' +
                    length +
                    ' bytes, but only ' +
                    exports.maxObjectSize +
                    ' are available.');
            }
            return null;
        }
        function parseDate() {
            if (objInfo != 0x3) {
                console.error('Unknown date type :' + objInfo + '. Parsing anyway...');
            }
            const dateBuffer = buffer.slice(offset + 1, offset + 9);
            return new Date(EPOCH + 1000 * dateBuffer.readDoubleBE(0));
        }
        function parseData() {
            let dataoffset = 1;
            let length = objInfo;
            if (objInfo == 0xf) {
                const int_type = buffer[offset + 1];
                const intType = (int_type & 0xf0) / 0x10;
                if (intType != 0x1) {
                    console.error('0x4: UNEXPECTED LENGTH-INT TYPE! ' + intType);
                }
                const intInfo = int_type & 0x0f;
                const intLength = Math.pow(2, intInfo);
                dataoffset = 2 + intLength;
                if (intLength < 3) {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
                else {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
            }
            if (length < exports.maxObjectSize) {
                return buffer.slice(offset + dataoffset, offset + dataoffset + length);
            }
            throw new Error('Too little heap space available! Wanted to read ' +
                length +
                ' bytes, but only ' +
                exports.maxObjectSize +
                ' are available.');
        }
        function parsePlistString(isUtf16) {
            isUtf16 = isUtf16 || 0;
            let enc = 'utf8';
            let length = objInfo;
            let stroffset = 1;
            if (objInfo == 0xf) {
                const int_type = buffer[offset + 1];
                const intType = (int_type & 0xf0) / 0x10;
                if (intType != 0x1) {
                    console.error('UNEXPECTED LENGTH-INT TYPE! ' + intType);
                }
                const intInfo = int_type & 0x0f;
                const intLength = Math.pow(2, intInfo);
                stroffset = 2 + intLength;
                if (intLength < 3) {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
                else {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
            }
            // length is String length -> to get byte length multiply by 2, as 1 character takes 2 bytes in UTF-16
            length *= isUtf16 + 1;
            if (length < exports.maxObjectSize) {
                let plistString = Buffer.from(buffer.slice(offset + stroffset, offset + stroffset + length));
                if (isUtf16) {
                    plistString = swapBytes(plistString);
                    enc = 'ucs2';
                }
                return plistString.toString(enc);
            }
            throw new Error('Too little heap space available! Wanted to read ' +
                length +
                ' bytes, but only ' +
                exports.maxObjectSize +
                ' are available.');
        }
        function parseArray() {
            let length = objInfo;
            let arrayoffset = 1;
            if (objInfo == 0xf) {
                const int_type = buffer[offset + 1];
                const intType = (int_type & 0xf0) / 0x10;
                if (intType != 0x1) {
                    console.error('0xa: UNEXPECTED LENGTH-INT TYPE! ' + intType);
                }
                const intInfo = int_type & 0x0f;
                const intLength = Math.pow(2, intInfo);
                arrayoffset = 2 + intLength;
                if (intLength < 3) {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
                else {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
            }
            if (length * objectRefSize > exports.maxObjectSize) {
                throw new Error('Too little heap space available!');
            }
            const array = [];
            for (let i = 0; i < length; i++) {
                const objRef = readUInt(buffer.slice(offset + arrayoffset + i * objectRefSize, offset + arrayoffset + (i + 1) * objectRefSize));
                array[i] = parseObject(objRef);
            }
            return array;
        }
        function parseDictionary() {
            let length = objInfo;
            let dictoffset = 1;
            if (objInfo == 0xf) {
                const int_type = buffer[offset + 1];
                const intType = (int_type & 0xf0) / 0x10;
                if (intType != 0x1) {
                    console.error('0xD: UNEXPECTED LENGTH-INT TYPE! ' + intType);
                }
                const intInfo = int_type & 0x0f;
                const intLength = Math.pow(2, intInfo);
                dictoffset = 2 + intLength;
                if (intLength < 3) {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
                else {
                    length = readUInt(buffer.slice(offset + 2, offset + 2 + intLength));
                }
            }
            if (length * 2 * objectRefSize > exports.maxObjectSize) {
                throw new Error('Too little heap space available!');
            }
            if (debug) {
                console.log('Parsing dictionary #' + tableOffset);
            }
            const dict = {};
            for (let i = 0; i < length; i++) {
                const keyRef = readUInt(buffer.slice(offset + dictoffset + i * objectRefSize, offset + dictoffset + (i + 1) * objectRefSize));
                const valRef = readUInt(buffer.slice(offset + dictoffset + length * objectRefSize + i * objectRefSize, offset + dictoffset + length * objectRefSize + (i + 1) * objectRefSize));
                const key = parseObject(keyRef);
                const val = parseObject(valRef);
                if (debug) {
                    console.log('  DICT #' + tableOffset + ': Mapped ' + key + ' to ' + val);
                }
                dict[key] = val;
            }
            return dict;
        }
    }
    return [parseObject(topObject)];
};
exports.parseBuffer = parseBuffer;
function readUInt(buffer, start = 0) {
    start = start || 0;
    let l = 0;
    for (let i = start; i < buffer.length; i++) {
        l <<= 8;
        l |= buffer[i] & 0xff;
    }
    return l;
}
// we're just going to toss the high order bits because javascript doesn't have 64-bit ints
function readUInt64BE(buffer, start) {
    const data = buffer.slice(start, start + 8);
    return data.readUInt32BE(4, 8);
}
function swapBytes(buffer) {
    const len = buffer.length;
    for (let i = 0; i < len; i += 2) {
        const a = buffer[i];
        buffer[i] = buffer[i + 1];
        buffer[i + 1] = a;
    }
    return buffer;
}
//# sourceMappingURL=osxBinary.js.map