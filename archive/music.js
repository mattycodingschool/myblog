document.addEventListener("DOMContentLoaded", function () {
    const musicContainers = document.querySelectorAll('.music');

    musicContainers.forEach(container => {
        const link = container.getAttribute('data-link');
        const iframe = document.createElement('iframe');
        iframe.setAttribute('style', 'border-radius: 12px');
        iframe.setAttribute('src', `https://open.spotify.com/embed/track/${getTrackId(link)}`);
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '152');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
        iframe.setAttribute('loading', 'lazy');
        container.appendChild(iframe);
    });

    function getTrackId(link) {
        // Extract the track ID from the Spotify URL
        const regex = /spotify\.com\/(?:[^\/]+\/){2}([^\/?]+)/;
        const match = link.match(regex);
        if (match && match[1]) {
            return match[1];
        } else {
            return ''; // Handle invalid or unsupported URLs
        }
    }
});
