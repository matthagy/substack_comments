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
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const categorySelect = document.getElementById('category');
    const searchInput = document.getElementById('search');
    const commentCount = document.getElementById('commentCount');
    [sortSelect, typeSelect, showSelect, pageSelect, startDateInput, endDateInput, categorySelect].forEach(select => {
        select.addEventListener("change", update);
    });
    searchInput.addEventListener("input", debounceUpdate);

    const categories = [...new Set(window._comments.map(comment => comment['category']))]
        .sort((a, b) => a.localeCompare(b));
    categories.forEach(category => {
        const option = document.createElement('option');
        option.appendChild(document.createTextNode(category));
        option.setAttribute('value', category);
        categorySelect.add(option);
    })

    const dates = window._comments.map(comment => comment.timestamp);
    const secondsInDay = 24 * 60 * 60;
    startDateInput.valueAsDate = new Date(Math.min(...dates) * 1000);
    endDateInput.valueAsDate = new Date((Math.max(...dates) + secondsInDay) * 1000);

    let pendingUpdate = null;

    function debounceUpdate() {
        if (pendingUpdate) {
            window.clearTimeout(pendingUpdate);
        }
        pendingUpdate = window.setTimeout(update, 200)
    }

    let lastSelectCommentType = null;
    let lastSortBy = null;
    let lastShowComments = null;
    let lastSearchTerms = null;
    let lastStartDate = null;
    let lastEndDate = null;
    let lastCategory = null;
    let updating = false;

    update();

    function extractQuotedRegex(input) {
        const regex = /<([^>]+)>|(["'])(?:(?!\2).)+\2/g;
        const terms = [];
        let match;

        while ((match = regex.exec(input)) !== null) {
            let matched = match[0];
            if (matched.startsWith('<') && matched.endsWith('>')) {
                terms.push(match[1]);
            } else {
                terms.push(matched.slice(1, -1));
            }
            input = input.replace(matched, ' ');
        }

        return [terms, input];
    }

    function update() {
        if (updating) {
            console.log('recursive update');
            return;
        }
        console.log('updating');
        updating = true;
        const startTime = new Date().getTime();
        const selectCommentType = typeSelect.value;
        const sortBy = sortSelect.value;
        const showComments = showSelect.value;
        const searchTerms = searchInput.value.trim();
        const category = categorySelect.value;
        const pagesChange = lastSelectCommentType !== selectCommentType
            || lastSortBy !== sortBy
            || lastShowComments !== showComments
            || lastSearchTerms !== searchTerms
            || lastStartDate !== startDateInput.value
            || lastEndDate !== endDateInput.value
            || lastCategory !== category;
        const pageNumber = pagesChange ? 1 : parseInt(pageSelect.value);
        lastSelectCommentType = selectCommentType;
        lastSortBy = sortBy;
        lastShowComments = showComments;
        lastSearchTerms = searchTerms;
        lastStartDate = startDateInput.value;
        lastEndDate = endDateInput.value;
        lastCategory = category;

        let comments = window._comments.filter(comment => {
            switch (selectCommentType) {
                case 'all':
                    return true;
                case 'top':
                    return comment['top_level'];
                case 'reply':
                    return !comment['top_level'];
            }
        }).filter(comment => lastCategory === 'all' || comment['category'] === category);

        const startTimestamp = startDateInput.value
            ? new Date(startDateInput.value).getTime() / 1000
            : null;
        const endTimestamp = endDateInput.value
            ? new Date(endDateInput.value).getTime() / 1000
            : null;

        comments = comments.filter(comment =>
            (startTimestamp === null || comment.timestamp >= startTimestamp) &&
            (endTimestamp === null || comment.timestamp <= endTimestamp));

        const [extractedTerms, remainingInput] = extractQuotedRegex(searchTerms);
        const terms = remainingInput.length ? remainingInput.trim().split(/\s+/).filter(Boolean) : [];
        const combinedTerms = extractedTerms.concat(terms);

        if (combinedTerms.length > 0) {
            console.log(`combinedTerms=${combinedTerms}`);
            const termsRegex = combinedTerms.map(term => {
                try {
                    return RegExp(term, "i");
                } catch (e) {
                    console.error(`Invalid regex: ${term}`, e);
                    return null;
                }
            }).filter(regex => regex !== null);

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
                case 'reply_count':
                    return a['total_children'] > b['total_children'] ? -1 : 1;
            }
        });

        clearChildren(commentCount);
        commentCount.appendChild(document.createTextNode(`${comments.length} matching comments`));

        let pages = 1;
        if (showComments !== 'all') {
            const commentsToShow = parseInt(showComments);
            console.log(`commentsToShow=${commentsToShow}`);
            pages = Math.ceil(comments.length / commentsToShow);
            console.log(`pages=${pages} pageNumber=${pageNumber}`);
            const start = (pageNumber - 1) * commentsToShow;
            const end = pageNumber * commentsToShow;
            console.log(`slice ${start} ${end}`);
            comments = comments.slice(start, end);
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

        function createTermMatcher() {
            try {
                return RegExp(combinedTerms.map(term => `(?:${term})`).join("|"), "ig");
            } catch (e) {
                console.error('Invalid regex', e);
                return null;
            }
        }

        const termsMatcher = combinedTerms.length > 0
            ? createTermMatcher()
            : null;
        comments.forEach(comment => {
            renderComment(comment, termsMatcher);
        });
        updating = false;
        const endTime = new Date().getTime();
        console.log(`update took ${endTime - startTime}ms`);
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
            if (!maxIterations--) {
                console.error('Max iterations hit, aborting.')
                break;
            }
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
