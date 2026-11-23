const destination = new URL('https://kartenkunde.app/');
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    window.location.replace(destination.href);
