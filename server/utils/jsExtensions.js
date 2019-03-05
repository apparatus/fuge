
const ANSI_COLORS_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

String.prototype.removeANSIColors = function() {
    return this.replace(ANSI_COLORS_REGEX, '')
}

String.prototype.safeMatch = function(regex) {
    const matches = this.match(regex)
    if (!matches) {
        return []
    }
    return matches
}

JSON.tryParse = function(string) {
    try {
        return JSON.parse(string)
    } catch (error) {
        return string
    }
}