let main = document.getElementById('main');

function clear(elem) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
}

let updatePosition = true
let positionUpdated = (newPosition) => {}

positionUpdated = (newPosition) => {
    clear(main);
    main.appendChild(document.createTextNode(newPosition.timestamp));
}

if(navigator.geolocation) {
    let watchId = navigator.geolocation.watchPosition((position) => {
        positionUpdated(position);
        if(!updatePosition) {
            navigator.geolocation.clearWatch(watchId);
        }
    })
} else {
    clear(main);
    main.appendChild(document.createTextNode('No GPS'));
}

