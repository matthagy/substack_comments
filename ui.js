const loadComments = async () => {
    const allComments = await fetch('./comments.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Failed to fetch comments:', error);
            return error.message || 'Unknown error';
        });

    const commentsDiv = document.getElementById("comments");
    if (typeof allComments === 'string') {
        commentsDiv.appendChild(document.createTextNode(`Failed to fetch comments: ${allComments}`));
        return;
    }

    const sortSelect = document.getElementById('sort');
    const typeSelect = document.getElementById('type');
    const showSelect = document.getElementById('show');
    const pageSelect = document.getElementById('page');
    const totalPages = document.getElementById('totalPages');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const categorySelect = document.getElementById('category');
    const searchInput = document.getElementById('search');
    const tagsSelect = document.getElementById('tags');
    const commentCount = document.getElementById('commentCount');
    const resetButton = document.getElementById('reset');

    const categoryCount = {};
    allComments.forEach(comment => {
        categoryCount[comment['category']] = (categoryCount[comment['category']] || 0) + 1;
    });

    const categories = [...new Set(allComments.map(comment => comment['category']))]
        .sort((a, b) => a.localeCompare(b));
    categories.forEach(category => {
        const option = document.createElement('option');
        option.appendChild(document.createTextNode(`${category} (${categoryCount[category]})`));
        option.setAttribute('value', category);
        categorySelect.add(option);
    });

    const tagsCount = {};
    allComments.forEach(comment => {
        comment.tags.forEach(tag => {
            tagsCount[tag] = (tagsCount[tag] || 0) + 1;
        });
    });

    Object.keys(tagsCount).sort((a, b) => a.localeCompare(b))
        .filter(tag => tagsCount[tag] > 5)
        .forEach(tag => {
            const option = document.createElement('option');
            option.appendChild(document.createTextNode(`${tag} (${tagsCount[tag]})`));
            option.setAttribute('value', tag);
            tagsSelect.add(option);
        });

    const dates = allComments.map(comment => comment.timestamp);
    const secondsInDay = 24 * 60 * 60;
    startDateInput.valueAsDate = new Date(Math.min(...dates) * 1000);
    endDateInput.valueAsDate = new Date((Math.max(...dates) + secondsInDay) * 1000);

    let pendingUpdate = null;

    const debounceUpdate = () => {
        if (pendingUpdate) {
            window.clearTimeout(pendingUpdate);
        }
        pendingUpdate = window.setTimeout(update, 200);
    };

    let lastSelectCommentType = null;
    let lastSortBy = null;
    let lastShowComments = null;
    let lastSearchTerms = null;
    let lastStartDate = null;
    let lastEndDate = null;
    let lastCategory = null;
    let lastTags = null;
    let updating = false;

    const extractQuotedRegex = (input) => {
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
    };

    let hasReadHashParams = false;
    const initialParams = {
        sort: sortSelect.value,
        type: typeSelect.value,
        show: showSelect.value,
        page: pageSelect.value,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        category: categorySelect.value,
        search: searchInput.value.trim(),
        tags: Array.from(tagsSelect.selectedOptions).map(o => o.value)
    };

    const readParamsFromHash = () => {
        if (!window.location.hash) return;
        const hash = window.location.hash.substring(1); // remove '#'
        const params = new URLSearchParams(hash);

        if (params.has('sort')) sortSelect.value = params.get('sort');
        if (params.has('type')) typeSelect.value = params.get('type');
        if (params.has('show')) showSelect.value = params.get('show');
        if (params.has('page')) pageSelect.value = params.get('page');
        if (params.has('startDate')) startDateInput.value = params.get('startDate');
        if (params.has('endDate')) endDateInput.value = params.get('endDate');
        if (params.has('category')) categorySelect.value = params.get('category');
        if (params.has('search')) searchInput.value = params.get('search');

        if (params.has('tags')) {
            const selectedTags = params.get('tags').split(',');
            for (let i = 0; i < tagsSelect.options.length; i++) {
                tagsSelect.options[i].selected = selectedTags.includes(tagsSelect.options[i].value);
            }
        }

        hasReadHashParams = true;
    };

    const writeParamsToHash = () => {
        if (!hasReadHashParams) return;

        const params = new URLSearchParams();
        params.set('sort', sortSelect.value);
        params.set('type', typeSelect.value);
        params.set('show', showSelect.value);
        params.set('page', pageSelect.value);
        params.set('startDate', startDateInput.value);
        params.set('endDate', endDateInput.value);
        params.set('category', categorySelect.value);
        params.set('search', searchInput.value.trim());

        const selectedTags = Array.from(tagsSelect.selectedOptions).map(o => o.value);
        if (selectedTags.length > 0) {
            params.set('tags', selectedTags.join(','));
        }

        window.location.hash = params.toString();
    };

    const update = () => {
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
        const selectedTags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
        const pagesChange = lastSelectCommentType !== selectCommentType
            || lastSortBy !== sortBy
            || lastShowComments !== showComments
            || lastSearchTerms !== searchTerms
            || lastStartDate !== startDateInput.value
            || lastEndDate !== endDateInput.value
            || lastCategory !== category
            || lastTags !== selectedTags.join(',');
        const pageNumber = pagesChange ? 1 : parseInt(pageSelect.value);
        lastSelectCommentType = selectCommentType;
        lastSortBy = sortBy;
        lastShowComments = showComments;
        lastSearchTerms = searchTerms;
        lastStartDate = startDateInput.value;
        lastEndDate = endDateInput.value;
        lastCategory = category;
        lastTags = selectedTags.join(',');

        let comments = allComments.filter(comment => {
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

        if (selectedTags.length > 0 && selectedTags[0] !== 'all') {
            comments = comments.filter(comment =>
                selectedTags.every(tag => comment.tags.includes(tag))
            );
        }

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
                case 'length':
                    return computeLength(a) > computeLength(b) ? -1 : 1;
            }
        });

        clearChildren(commentCount);
        commentCount.appendChild(document.createTextNode(`${comments.length} matching comments out of ${allComments.length} total`));

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

        const createTermMatcher = () => {
            try {
                return RegExp(combinedTerms.map(term => `(?:${term})`).join("|"), "ig");
            } catch (e) {
                console.error('Invalid regex', e);
                return null;
            }
        };

        const termsMatcher = combinedTerms.length > 0
            ? createTermMatcher()
            : null;
        comments.forEach(comment => {
            renderComment(comment, termsMatcher);
        });
        updating = false;
        const endTime = new Date().getTime();
        console.log(`update took ${endTime - startTime}ms`);

        writeParamsToHash();
    };

    const clearChildren = (node) => {
        while (node.firstChild) {
            node.removeChild(node.lastChild);
        }
    };

    const createLink = (url, text, cssClass) => {
        const link = document.createElement('a');
        if (cssClass) {
            link.classList.add(cssClass);
        }
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const textNode = text instanceof HTMLElement ? text : document.createTextNode(text);
        link.appendChild(textNode);
        return link;
    };

    const extractDomainComponents = (url) => {
        try {
            const hostname = new URL(url).hostname;
            const urlParts = hostname.split('.');
            if (urlParts.length >= 2) {
                return urlParts.slice(-2).join('.'); // Last two components
            }
            return hostname; // Fallback to full hostname
        } catch (error) {
            console.error('Invalid URL:', url);
            return 'unknown'; // Fallback for completely invalid URLs
        }
    };

    const renderComment = (comment, termsMatcher) => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('metaContainer');
        entryDiv.appendChild(metaDiv);

        const createText = (text, cssClass) => {
            const textSpan = document.createElement('span');
            metaDiv.appendChild(textSpan);
            textSpan.classList.add(cssClass);
            textSpan.appendChild(document.createTextNode(text));
        };

        const createCommentLink = (commentId, text) => {
            metaDiv.appendChild(createLink(`${comment['canonical_url']}/comment/${commentId}`, text, 'meta'));
        };

        createText(comment['name'], 'name');
        createText(`❤ ${comment['likes']}, ${comment['date']}, FK=${comment['grade_level']}`, 'meta');
        metaDiv.appendChild(createLink(comment['canonical_url'], comment['title'].trim(), 'post-title'));
        let domain = extractDomainComponents(comment['canonical_url']);
        createText(`[${domain}]`, 'meta');
        createCommentLink(comment.id,
            `${comment.top_level ? 'top-level' : 'reply'} (${comment.total_children})`);

        if (!comment.top_level) {
            createCommentLink(comment.thread_id, `thread (${comment.thread_children})`);
            createCommentLink(comment.parent_id, `parent (${comment.parent_children})`);
        }

        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        categoryDiv.appendChild(document.createTextNode(`Category: ${comment['category']}`));
        metaDiv.appendChild(categoryDiv);

        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('tags');
        comment['tags'].sort((a, b) => a.localeCompare(b))
            .forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('tag');
                tagSpan.appendChild(document.createTextNode(tag));
                tagsDiv.appendChild(tagSpan);
            });
        metaDiv.appendChild(tagsDiv);

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);

        comment['body'].forEach(paragraph => {
            commentDiv.appendChild(createParagraph(paragraph, termsMatcher));
        });
        commentsDiv.appendChild(entryDiv);
    };

    const createParagraph = (paragraph, termsMatcher) => {
        const para = document.createElement('p');
        para.classList.add('comment-text');
        paragraph.forEach(span => {
            switch (span['type']) {
                case 'text':
                    createHighlightedText(para, span['value'], termsMatcher);
                    break;
                case 'url':
                    const link = document.createElement('a');
                    para.appendChild(createLink(span['value'], span['value'], 'link'));
                    link.classList.add('link');
                    link.setAttribute('href', span['value']);
                    createHighlightedText(link, span['value'], termsMatcher);
            }
        });
        return para;
    };

    const createHighlightedText = (parent, value, termsMatcher) => {
        if (termsMatcher === null) {
            parent.appendChild(document.createTextNode(value));
            return;
        }
        let match;
        let cur = 0;
        let maxIterations = 1000;
        while ((match = termsMatcher.exec(value)) !== null) {
            if (!maxIterations--) {
                console.error('Max iterations hit, aborting.');
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
    };

    const computeLength = (comment) => {
        return comment['body'].reduce((acc, paragraph) => {
            return acc + paragraph.reduce((acc, span) => {
                return acc + span['value'].length;
            }, 0);
        }, 0);
    };

    [sortSelect, typeSelect, showSelect, pageSelect, startDateInput, endDateInput, categorySelect, tagsSelect].forEach(select => {
        select.addEventListener("change", update);
    });
    searchInput.addEventListener("input", debounceUpdate);

    resetButton.addEventListener('click', () => {
        sortSelect.value = initialParams.sort;
        typeSelect.value = initialParams.type;
        showSelect.value = initialParams.show;
        pageSelect.value = initialParams.page;
        startDateInput.value = initialParams.startDate;
        endDateInput.value = initialParams.endDate;
        categorySelect.value = initialParams.category;
        searchInput.value = initialParams.search;

        for (let i = 0; i < tagsSelect.options.length; i++) {
            tagsSelect.options[i].selected = initialParams.tags.includes(tagsSelect.options[i].value);
        }

        update();
    });

    readParamsFromHash();
    update();
};

window.addEventListener('DOMContentLoaded', loadComments);