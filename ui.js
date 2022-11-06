function loadComments() {
    if (typeof window._comments === 'undefined') {
        console.log('comments not loaded yet');
        window.setTimeout(loadComments, 100);
        return;
    }

    const commentsDiv = document.getElementById("comments");

    const sortSelect = document.getElementById('sort');
    const typeSelect = document.getElementById('type');
    const showSelect = document.getElementById('show');
    const pageSelect = document.getElementById('page');
    const commentCount = document.getElementById('commentCount');
    [sortSelect, typeSelect, showSelect, pageSelect].forEach(select => {
        select.addEventListener("change", update);
    });

    let lastSelectCommentType = null;
    let lastSortBy = null;
    let lastShowComments = null;
    let updating = false;

    update();

    function update() {
        if (updating) {
            console.log('recursive update');
            return;
        }
        console.log('updating');
        updating = true;
        const selectCommentType = typeSelect.value;
        const sortBy = sortSelect.value;
        const showComments = showSelect.value;
        const pagesChange = lastSelectCommentType !== selectCommentType
            || lastSortBy !== sortBy
            || lastShowComments !== showComments;
        const pageNumber = pagesChange ? 1 : parseInt(pageSelect.value);
        lastSelectCommentType = selectCommentType;
        lastSortBy = sortBy;
        lastShowComments = showComments;

        console.log(`selectCommentType=${selectCommentType}`);
        console.log(`sortBy=${sortBy}`);
        console.log(`showComments=${showComments}`);
        console.log(`pageNumber=${pageNumber}`);
        console.log(`pagesChange=${pagesChange}`);

        let comments = window._comments.filter(comment => {
            switch (selectCommentType) {
                case 'all':
                    return true;
                case 'top':
                    return comment['top_level'];
                case 'reply':
                    return !comment['top_level'];
            }
        });
        comments.sort((a, b) => {
            switch (sortBy) {
                case 'likes':
                    return a['likes'] > b['likes'] ? -1 : 1;
                case 'new':
                    return a['timestamp'] < b['timestamp'] ? 1 : -1;
                case 'old':
                    return a['timestamp'] > b['timestamp'] ? 1 : -1;
            }
        });

        clearChildren(commentCount);
        commentCount.appendChild(document.createTextNode(`${comments.length} comments`));

        let pages = 1;
        if (showComments !== 'all') {
            const commentCount = parseInt(showComments);
            console.log(`commentCount=${commentCount}`);
            pages = Math.ceil(comments.length / commentCount);
            console.log(`slice ${(pageNumber - 1) * commentCount} ${pageNumber * commentCount}`);
            comments = comments.slice((pageNumber - 1) * commentCount, pageNumber * commentCount);
            console.log(`comments.length=${comments.length}`);

        }
        console.log(`pages=${pages}`);

        clearChildren(pageSelect);
        for (let i = 1; i <= pages; i++) {
            const pageOption = document.createElement('option');
            pageOption.appendChild(document.createTextNode(i + ''));
            pageOption.setAttribute('value', i + '');
            pageSelect.add(pageOption);
        }
        pageSelect.selectedIndex = pageNumber - 1;


        clearChildren(commentsDiv);
        comments.forEach(comment => {
            renderComment(comment);
        });
        updating = false;
        console.log("------------Update Done----------------");
    }

    function clearChildren(node) {
        while (node.firstChild) {
            node.removeChild(node.lastChild);
        }
    }

    function renderComment(comment) {
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
        postLink.appendChild(document.createTextNode(comment['title'].trim()));

        const typeSpan = document.createElement('span');
        metaDiv.appendChild(typeSpan);
        typeSpan.classList.add('meta');
        typeSpan.appendChild(document.createTextNode(`${comment['top_level'] ? 'top-level' : 'reply'} comment`));

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);

        comment['body'].split("\n\n").forEach(paragraph => {
            const para = document.createElement('p');
            para.classList.add('comment-text');
            para.appendChild(document.createTextNode(paragraph));
            commentDiv.appendChild(para);
        });
        commentsDiv.appendChild(entryDiv);
    }
}

window.addEventListener('DOMContentLoaded', loadComments);
