const currentlyPlayingGameID = '1903340'; 

document.addEventListener('DOMContentLoaded', () => {
    fetchAllData();
    setInterval(fetchAllData, 60000); 
});

async function fetchAllData() {
    const backendUrl = 'https://spotify-api-production-4a82.up.railway.app';

    try {
        if (!currentlyPlayingGameID) return;

        const res = await fetch(`${backendUrl}/api/steam-game?appid=${currentlyPlayingGameID}`);
        if (!res.ok) throw new Error(`Failed to fetch Steam data: ${res.statusText}`);

        const steamGameData = await res.json();
        if (steamGameData) {
            renderSteamWidget(steamGameData);
        }
    } catch (error) {
        console.error('Error fetching Steam data:', error);
        const container = document.getElementById('steam-widget-container');
        if (container) container.innerHTML = '<p>Could not load Steam data at the moment.</p>';
    }
}

function renderNowPlaying(data) {
    /* 
    const container = document.getElementById('spotify-now-playing');
    if (!data.hasData) {
        container.innerHTML = ''; 
        return;
    }

    const headerText = data.isPlaying 
        ? `<div class="live-indicator"></div> Now Playing`
        : 'Last Played';

    container.innerHTML = `
        <div class="now-playing-card">
            <img src="${data.albumImageUrl}" alt="Album art for ${data.album}">
            <div class="now-playing-info">
                <div class="now-playing-header">${headerText}</div>
                <a href="${data.songUrl}" target="_blank" class="now-playing-title">${data.title}</a>
                <p class="now-playing-artist">${data.artist}</p>
            </div>
        </div>
    `;
    */
}

function renderTopTracks(tracks) {
    /*
    const container = document.getElementById('spotify-top-tracks');
    if (!tracks || tracks.length === 0) return;

    container.innerHTML = tracks.map(track => `
        <a href="${track.songUrl}" target="_blank" class="spotify-item">
            <img src="${track.albumImageUrl}" alt="Album art for ${track.title}">
            <div class="spotify-item-info">
                <span>${track.title}<br></span>
                <span>${track.artist}</span>
            </div>
        </a>
    `).join('');
    */
}

function renderTopArtists(artists) {
    /* 
    const container = document.getElementById('spotify-top-artists');
    if (!artists || artists.length === 0) return;

    container.innerHTML = artists.map(artist => `
        <a href="${artist.artistUrl}" target="_blank" class="spotify-item">
            <img src="${artist.imageUrl}" alt="Image of ${artist.name}" class="artist-image">
            <div class="spotify-item-info">
                <span>${artist.name}</span>
            </div>
        </a>
    `).join('');
    */
}

function renderSteamWidget(data) {
    const container = document.getElementById('steam-widget-container');
    if (!data || !data.name) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="spotify-section">
            <h3>Currently Playing</h3>
            <a href="${data.steamUrl}" target="_blank" class="steam-card">
                <img src="${data.imageUrl}" alt="Banner for ${data.name}" class="steam-card-image">
                <div class="steam-card-info">
                    <h4 class="steam-card-title">${data.name}</h4>
                    <p class="steam-card-description">${data.description}</p>
                </div>
            </a>
        </div>
    `;
}
