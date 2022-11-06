function loadComments() {
    window._comments.sort((a, b) => {
        return a['likes'] > b['likes'] ? -1 : 1;
    })
    window._comments.forEach(comment => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        const metaDiv = document.createElement('div');
        entryDiv.appendChild(metaDiv);

        const likeSpan = document.createElement('span');
        metaDiv.appendChild(likeSpan);
        likeSpan.classList.add('meta');
        likeSpan.appendChild(document.createTextNode(`❤ ${comment['likes']} - `));

        const dateLink = document.createElement('a');
        metaDiv.appendChild(dateLink);
        dateLink.classList.add('meta');
        dateLink.setAttribute('href', `${comment['canonical_url']}/comment/${comment['id']}`);
        dateLink.appendChild(document.createTextNode(comment['date']));

        const postLink = document.createElement('a');
        metaDiv.appendChild(postLink);
        postLink.classList.add('post-title');
        postLink.setAttribute('href', comment['canonical_url']);
        postLink.appendChild(document.createTextNode(comment['title']));

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);

        comment['body'].split("\n\n").forEach(paragraph => {
            const para = document.createElement('p');
            para.classList.add('comment-text');
            para.appendChild(document.createTextNode(paragraph));
            commentDiv.appendChild(para);
        });
        document.body.appendChild(entryDiv);
    });
}

window.addEventListener('load', loadComments);
