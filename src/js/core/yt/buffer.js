function calcBackOff(buffer, pos) {
    const op = buffer[pos++];
    const key = op >> 3;
    if (key === 4) {
        let tmpVal = buffer[pos++];
        if (tmpVal < 128)
            return tmpVal;
        let result = tmpVal & 127;
        for (var d = 1; tmpVal >= 128;) {
            tmpVal = buffer[pos++];
            d *= 128;
            result += (tmpVal & 127) * d;
        }
        return result;
    }
    return -1;
}

function get(buffer, pos) {
    return buffer[pos];
}

function readData(buffer, pos) {
    if (pos + 1 <= buffer.length) {
        var e = get(buffer, pos);
        e = e < 128 ? 1 : e < 192 ? 2 : e < 224 ? 3 : e < 240 ? 4 : 5
    } else
        e = 0;
    if (e < 1 || !(pos + e <= buffer.length))
        return [-1, pos];
    if (e === 1)
        buffer = get(buffer, pos++);
    else if (e === 2)
        e = get(buffer, pos++),
            buffer = get(buffer, pos++),
            buffer = (e & 63) + 64 * buffer;
    else if (e === 3) {
        e = get(buffer, pos++);
        var d = get(buffer, pos++);
        buffer = get(buffer, pos++);
        buffer = (e & 31) + 32 * (d + 256 * buffer)
    } else if (e === 4) {
        e = get(buffer, pos++);
        d = get(buffer, pos++);
        var C = get(buffer, pos++);
        buffer = get(buffer, pos++);
        buffer = (e & 15) + 16 * (d + 256 * (C + 256 * buffer))
    } else
        throw new Error("Reading unsupported Size e = " + e);
    return [buffer, pos];
}

function findBackoffTime(buffer) {
    try {
        let pos = 0;
        while (pos < buffer.length) {
            let op, length;
            [op, pos] = readData(buffer, pos);
            [length, pos] = readData(buffer, pos);
            if (op < 0 || length < 0)
                throw new Error(`Invalid op = ${op}, length = ${length}`);
            if (!(pos + length <= buffer.length))
                throw new Error("Insufficient data");

            if (op === 35) {
                return calcBackOff(buffer, pos);
            }
            pos += length;
        }
    } catch (error) {
        logMessage('Unable to find backoff time: ' + error.message);
    }
    return -1;
}