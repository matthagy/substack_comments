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
    const totalPages = document.getElementById('totalPages');
    const searchInput = document.getElementById('search');
    const commentCount = document.getElementById('commentCount');
    [sortSelect, typeSelect, showSelect, pageSelect].forEach(select => {
        select.addEventListener("change", update);
    });
    searchInput.addEventListener("input", update);

    let lastSelectCommentType = null;
    let lastSortBy = null;
    let lastShowComments = null;
    let lastSearchTerms = null;
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
        const searchTerms = searchInput.value.trim();
        const pagesChange = lastSelectCommentType !== selectCommentType
            || lastSortBy !== sortBy
            || lastShowComments !== showComments
            || lastSearchTerms !== searchTerms;
        const pageNumber = pagesChange ? 1 : parseInt(pageSelect.value);
        lastSelectCommentType = selectCommentType;
        lastSortBy = sortBy;
        lastShowComments = showComments;
        lastSearchTerms = searchTerms;

        console.log(`selectCommentType=${selectCommentType}`);
        console.log(`sortBy=${sortBy}`);
        console.log(`showComments=${showComments}`);
        console.log(`pageNumber=${pageNumber}`);
        console.log(`searchTerms=${searchTerms}`);
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
        const terms = searchTerms.length ? searchTerms.split(/\s+/) : [];
        if (terms.length > 0) {
            console.log(`terms=${terms}`);
            const termsRegex = terms.map(term => RegExp(".*" + term, "i"));
            comments = comments.filter((comment) =>
                termsRegex.every((term) =>
                    comment['body'].some(paragraph =>
                        paragraph.some(span => term.test(span['value']))
                    )));
        }
        comments.sort((a, b) => {
            switch (sortBy) {
                case 'likes':
                    return a['likes'] > b['likes'] ? -1 : 1;
                case 'new':
                    return a['timestamp'] < b['timestamp'] ? 1 : -1;
                case 'old':
                    return a['timestamp'] > b['timestamp'] ? 1 : -1;
                case 'ratio_recv':
                    return a['ratio_recv'] > b['ratio_recv'] ? -1 : 1;
                case 'ratio_give':
                    return a['ratio_give'] > b['ratio_give'] ? -1 : 1;
                case 'fk_asc':
                    return a['grade_level'] < b['grade_level'] ? -1 : 1;
                case 'fk_desc':
                    return a['grade_level'] > b['grade_level'] ? -1 : 1;
            }
        });

        clearChildren(commentCount);
        commentCount.appendChild(document.createTextNode(`${comments.length} matching comments`));

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
        clearChildren(totalPages);
        totalPages.appendChild(document.createTextNode(`of ${pages}`));

        clearChildren(pageSelect);
        for (let i = 1; i <= pages; i++) {
            const pageOption = document.createElement('option');
            pageOption.appendChild(document.createTextNode(i + ''));
            pageOption.setAttribute('value', i + '');
            pageSelect.add(pageOption);
        }
        pageSelect.selectedIndex = pageNumber - 1;

        clearChildren(commentsDiv);

        const termsMatcher = terms.length > 0 ? RegExp(terms.join("|"), "ig") : null;
        comments.forEach(comment => {
            renderComment(comment, termsMatcher);
        });
        updating = false;
        console.log("------------Update Done----------------");
    }

    function clearChildren(node) {
        while (node.firstChild) {
            node.removeChild(node.lastChild);
        }
    }

    function createLink(url, text, cssClass) {
        const link = document.createElement('a');
        if (cssClass) {
            link.classList.add(cssClass);
        }
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.appendChild(document.createTextNode(text));
        return link;
    }

    function renderComment(comment, termsMatcher) {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        const metaDiv = document.createElement('div');
        entryDiv.appendChild(metaDiv);

        function createText(text, cssClass) {
            const likeSpan = document.createElement('span');
            metaDiv.appendChild(likeSpan);
            likeSpan.classList.add(cssClass);
            likeSpan.appendChild(document.createTextNode(text));
        }

        function createCommentLink(commentId, text) {
            metaDiv.appendChild(createLink(`${comment['canonical_url']}/comment/${commentId}`, text, 'meta'));
        }

        createText(comment['name'], 'name');
        createText(`❤ ${comment['likes']}, ${comment['date']}, FK=${comment['grade_level']}`, 'meta');
        metaDiv.appendChild(createLink(comment['canonical_url'], comment['title'].trim(), 'post-title'));
        createCommentLink(comment.id,
            `${comment.top_level ? 'top-level' : 'reply'} (${comment.total_children})`);

        if (!comment.top_level) {
            createCommentLink(comment.thread_id, `thread (${comment.thread_children})`);
            createCommentLink(comment.parent_id, `parent (${comment.parent_children})`);
        }

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);

        comment['body'].forEach(paragraph => {
            commentDiv.appendChild(createParagraph(paragraph, termsMatcher));
        });
        commentsDiv.appendChild(entryDiv);
    }

    function createParagraph(paragraph, termsMatcher) {
        const para = document.createElement('p');
        para.classList.add('comment-text');
        paragraph.forEach(span => {
            switch (span['type']) {
                case 'text':
                    createHighlightedText(para, span['value'], termsMatcher);
                    break;
                case 'url':
                    const link = document.createElement('a');
                    para.appendChild(link);
                    link.classList.add('link');
                    link.setAttribute('href', span['value']);
                    createHighlightedText(link, span['value'], termsMatcher);
            }
        });
        return para;
    }

    function createHighlightedText(parent, value, termsMatcher) {
        if (termsMatcher === null) {
            parent.appendChild(document.createTextNode(value));
            return;
        }
        let match;
        let cur = 0;
        let maxIterations = 1000;
        while ((match = termsMatcher.exec(value)) !== null) {
            if (!maxIterations--) throw new Error('Max iterations hit, aborting.');
            console.log(`match ${match}`)
            const start = match.index;
            const matchValue = match[0];
            if (start > cur) {
                parent.appendChild(document.createTextNode(value.substring(cur, start)));
            }
            const span = document.createElement('span');
            span.classList.add('highlight');
            span.appendChild(document.createTextNode(matchValue));
            parent.appendChild(span);
            cur = start + matchValue.length;
        }
        const remaining = value.substring(cur);
        if (remaining.length > 0) {
            parent.appendChild(document.createTextNode(remaining));
        }
    }
}

window.addEventListener('DOMContentLoaded', loadComments);
