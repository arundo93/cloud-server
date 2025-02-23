export function insertToArr(arr, item, sortFn = (a, b) => (a > b ? "more" : (a === b ? "equal" : "less"))){
    const idx = binarySearch(arr, item, sortFn);
    if(typeof idx === "undefined"){
        return [item];
    }
    else if(idx === -1){
        return [item].concat(arr);
    }
    else if(idx === arr.length){
        return arr.concat([item]);
    }
    else{
        return arr.slice(0, idx).concat([item], arr.slice(idx));
    }
}

function binarySearch(arr, item, isEqual){
    const next = {
        min: 0,
        max: arr.length - 1
    }
    let result = undefined;
    if(next.max < 0){
        return result;
    }
    let finish = false;
    if(isEqual(item, arr[next.min]) === "less"){
        result = -1;
        finish = true;
    }
    if(isEqual(item, arr[next.max]) === "more"){
        result = arr.length;
        finish = true;
    }
    while(!finish){
        const {min, max} = next;
        if(min === max || min === max - 1){
            result = max;
            finish = true;
            break;
        }
        const idx = min + parseInt((max - min) / 2 + "");
        const current = isEqual(item, arr[idx]);
        switch(current){
            case "less":
                next.max = idx;
                break;
            case "equal":
                result = idx;
                finish = true;
                break;
            case "more":
                next.min = idx;
                break;
        }
    }
    return result;
}