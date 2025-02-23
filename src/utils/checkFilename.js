export function checkFileName(filename) {
    const fileNamePattern = /[^\w\-.\ а-яА-ЯёЁїЇєЄа-яЁё一-龯ぁ-んァ-ン\u2E80-\u2FFF]/g;
    let result = filename.replace(/[&<>"'/]/g, (char) => {
        switch(char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            case '/': return '&#47;';
            default: return "";
        }
    });
    result = result.replace(fileNamePattern, "");
    return result;
}

export function checkFolderName(foldername){
    let sanitized = foldername.trim().replace(/[^a-zA-Z0-9._-]/g, "");
    const maxLength = 255;
    if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength); // Обрезаем до максимальной длины
    }
    return sanitized;
}