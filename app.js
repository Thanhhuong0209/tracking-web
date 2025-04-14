document.addEventListener('DOMContentLoaded', function() {
    const linkForm = document.getElementById('linkForm');
    const generatedLink = document.getElementById('generatedLink');
    const trackLink = document.getElementById('trackLink');
    const copyButton = document.getElementById('copyLink');
    const trackingData = document.getElementById('trackingData').querySelector('tbody');
    const detailsContent = document.getElementById('detailsContent');
    
    // Initialize map
    const map = L.map('trackingMap').setView([10.8231, 106.6297], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Load existing links
    loadLinks();
    
    // Handle link creation
    linkForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const targetUrl = document.getElementById('targetUrl').value;
        const linkName = document.getElementById('linkName').value;
        
        fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, linkName })
        })
        .then(response => response.json())
        .then(data => {
            trackLink.href = data.trackingLink;
            trackLink.textContent = data.trackingLink;
            generatedLink.style.display = 'block';
            
            // Reset form
            linkForm.reset();
            
            // Reload links
            loadLinks();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to create tracking link');
        });
    });
    
    // Handle copy link button
    copyButton.addEventListener('click', function(e) {
        e.preventDefault();
        navigator.clipboard.writeText(trackLink.href)
            .then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });
    
    function loadLinks() {
        fetch('/api/links')
            .then(response => response.json())
            .then(links => {
                trackingData.innerHTML = '';
                
                if (links.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td colspan="4" style="text-align: center;">No tracking links created yet</td>`;
                    trackingData.appendChild(row);
                    return;
                }
                
                links.forEach(link => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${link.name || 'Unnamed Link'}</td>
                        <td>${link.visits || 0}</td>
                        <td>${link.last_visit ? formatDate(link.last_visit) : 'Never'}</td>
                        <td>
                            <button class="view-btn" data-id="${link.id}">View</button>
                        </td>
                    `;
                    
                    trackingData.appendChild(row);
                });
                
                // Add event listeners to view buttons
                document.querySelectorAll('.view-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const linkId = this.getAttribute('data-id');
                        showLinkDetails(linkId);
                    });
                });
            })
            .catch(error => {
                console.error('Error:', error);
                trackingData.innerHTML = `<tr><td colspan="4">Failed to load tracking links</td></tr>`;
            });
    }
    
    function showLinkDetails(linkId) {
        fetch(`/api/visits/${linkId}`)
            .then(response => response.json())
            .then(visits => {
                // Clear existing markers
                map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });
                
                // Clear details content
                detailsContent.innerHTML = '';
                
                if (visits.length === 0) {
                    detailsContent.innerHTML = '<p>No visits recorded for this link yet</p>';
                    return;
                }
                
                // Add markers to map
                visits.forEach((visit, index) => {
                    if (visit.latitude && visit.longitude) {
                        const marker = L.marker([visit.latitude, visit.longitude]).addTo(map);
                        
                        let popupContent = `<b>${visit.city || 'Unknown location'}</b><br>`;
                        popupContent += `${visit.region ? visit.region + ', ' : ''}${visit.country || ''}<br>`;
                        popupContent += `<small>${formatDate(visit.timestamp)}</small>`;
                        
                        marker.bindPopup(popupContent);
                        
                        // Center map on the first marker
                        if (index === 0) {
                            map.setView([visit.latitude, visit.longitude], 8);
                        }
                    }
                });
                
                // Show visit details
                const latestVisit = visits[0];
                let detailsHTML = `
                    <p><strong>Latest Visit:</strong> ${formatDate(latestVisit.timestamp)}</p>
                    <p><strong>Location:</strong> ${latestVisit.city || 'Unknown'}, ${latestVisit.country || ''}</p>
                    <p><strong>IP Address:</strong> ${latestVisit.ip_address}</p>
                    <p><strong>Device:</strong> ${parseUserAgent(latestVisit.user_agent)}</p>
                    
                    <h4>All Visits (${visits.length})</h4>
                    <ul class="visit-list">
                `;
                
                visits.forEach(visit => {
                    detailsHTML += `
                        <li>
                            ${formatDate(visit.timestamp)} - 
                            ${visit.city || 'Unknown location'}, ${visit.country || ''}
                        </li>
                    `;
                });
                
                detailsHTML += `</ul>`;
                detailsContent.innerHTML = detailsHTML;
            })
            .catch(error => {
                console.error('Error:', error);
                detailsContent.innerHTML = '<p>Failed to load visit details</p>';
            });
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    function parseUserAgent(userAgent) {
        if (!userAgent) return 'Unknown';
        
        if (userAgent.includes('Mobile')) {
            return 'Mobile Device';
        } else if (userAgent.includes('Windows')) {
            return 'Windows PC';
        } else if (userAgent.includes('Macintosh')) {
            return 'Mac Computer';
        } else if (userAgent.includes('Linux')) {
            return 'Linux Computer';
        } else {
            return 'Desktop Device';
        }
    }
});
function showLocationDetails(location) {
    const detailsContent = document.getElementById('detailsContent');
    
    detailsContent.innerHTML = `
        <div class="location-card">
            <h4>${location.city || 'Unknown Location'}</h4>
            <div class="detail-row">
                <span class="detail-label">Country:</span>
                <span>${location.country || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Region:</span>
                <span>${location.region || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Coordinates:</span>
                <span>${location.latitude}, ${location.longitude}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span>${new Date(location.timestamp).toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">IP Address:</span>
                <span>${location.ip_address}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Device:</span>
                <span>${parseUserAgent(location.user_agent)}</span>
            </div>
        </div>
    `;
}

// Cập nhật hàm xử lý click marker
function setupMapMarkers(visits) {
    visits.forEach(visit => {
        if (visit.latitude && visit.longitude) {
            const marker = L.marker([visit.latitude, visit.longitude])
                .addTo(map)
                .on('click', () => {
                    showLocationDetails(visit);
                    map.setView([visit.latitude, visit.longitude], 12);
                });
        }
    });
}
document.getElementById('linkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('http://localhost:3000/api/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetUrl: document.getElementById('targetUrl').value,
                linkName: document.getElementById('linkName').value
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi server');
        }

        const data = await response.json();
        console.log('Link tạo thành công:', data);
        alert(`Tạo link thành công: ${data.trackingLink}`);
        
    } catch (error) {
        console.error('Lỗi khi tạo link:', error);
        alert('Lỗi khi tạo link: ' + error.message);
    }
});