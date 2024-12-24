/**
 * @typedef {Object} BodySpan
 * @property {string} type
 * @property {string} value
 */

/**
 * @typedef {Object} Comment
 * @property {number} post_id
 * @property {string} title
 * @property {string} canonical_url
 * @property {string} name
 * @property {number} user_id
 * @property {number} id
 * @property {boolean} top_level
 * @property {string} date
 * @property {number} likes
 * @property {number} timestamp
 * @property {BodySpan[]} body
 * @property {number} total_children
 * @property {number} parent_id
 * @property {number} parent_children
 * @property {number} thread_id
 * @property {number} thread_children
 * @property {number} ratio_recv
 * @property {number} ratio_give
 * @property {number} grade_level
 * @property {number} word_count
 * @property {string} category
 * @property {string[]} tags
 */

/**
 * @typedef {Object} UIState
 * @property {string} selectCommentType
 * @property {string} sortBy
 * @property {string} showComments
 * @property {string} searchTerms
 * @property {string} category
 * @property {string[]} selectedTags
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} pageNumber
 */


const loadComments = async () => {
    /**
     * @type {Comment[] | string}
     */
    const commentsOrError = await fetch('./comments.json')
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

    /**
     * @param {string} id
     * @returns {HTMLElement}
     */
    const getElementById = (id) => {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Element with id ${id} not found`);
        return element;
    }
    /**
     * @param {string} id
     * @returns {HTMLSelectElement}
     */
    const getSelectById = (id) => {
        const element = getElementById(id);
        if (!(element instanceof HTMLSelectElement)) throw new Error(`Element with id ${id} is not a select`);
        return element
    }
    /**
     * @param {string} id
     * @returns {HTMLInputElement}
     */
    const getInputById = (id) => {
        const element = getElementById(id);
        if (!(element instanceof HTMLInputElement)) throw new Error(`Element with id ${id} is not an input`);
        return element
    }

    const commentsDiv = getElementById("comments");
    if (typeof commentsOrError === 'string') {
        commentsDiv.appendChild(document.createTextNode(`Failed to fetch comments: ${commentsOrError}`));
        return;
    }

    /**
     * @type {Comment[]}
     */
    const allComments = commentsOrError;

    const sortSelect = getSelectById('sort');
    const typeSelect = getSelectById('type');
    const showSelect = getSelectById('show');
    const pageSelect = getSelectById('page');
    const totalPages = getElementById('totalPages');
    const startDateInput = getInputById('startDate');
    const endDateInput = getInputById('endDate');
    const categorySelect = getSelectById('category');
    const searchInput = getInputById('search');
    const tagsSelect = getSelectById('tags');
    const commentCount = getElementById('commentCount');
    const resetButton = getElementById('reset');

    /**
     * @type {{ [tag: string]: number }}
     */
    const categoryCount = {};
    allComments.forEach(comment => {
        categoryCount[comment.category] = (categoryCount[comment.category] || 0) + 1;
    });

    const categories = Object.keys(categoryCount).sort((a, b) => a.localeCompare(b));
    categories.forEach(category => {
        const option = document.createElement('option');
        option.appendChild(document.createTextNode(`${category} (${categoryCount[category]})`));
        option.setAttribute('value', category);
        categorySelect.add(option);
    });

    /**
     * @param {number} n
     * @returns {string[]}
     */
    const generateHSVPalette = (n) => {
        const palette = [];
        for (let i = 0; i < n; i++) {
            const hue = (i / n) * 360; // Evenly spaced hues around the color wheel
            const saturation = 70; // Moderate saturation for vibrant yet soft colors
            const value = 50;
            const alpha = 0.3;
            palette.push(`hsla(${hue}, ${saturation}%, ${value}%, ${alpha})`);
        }
        return palette;
    };

    /**
     * @type {{ [tag: string]: number }}
     */
    const tagsCount = {};
    allComments.forEach(comment => {
        comment.tags.forEach(tag => tagsCount[tag] = (tagsCount[tag] || 0) + 1);
    });
    const allTags = Object.keys(tagsCount);
    const topTags = allTags.sort((a, b) => tagsCount[b] - tagsCount[a]).slice(0, 20);
    console.log('topTags', topTags.map(tag => `${tag} (${tagsCount[tag]})`));
    const tagsColorArray = generateHSVPalette(topTags.length);
    /**
     * @type {{ [tag: string]: string }}
     */
    const tagColors = topTags.reduce((acc, tag, index) => {
        acc[tag] = tagsColorArray[index];
        return acc;
    }, {});

    allTags.filter(tag => tagsCount[tag] > 5)
        .sort((a, b) => a.localeCompare(b))
        .forEach(tag => {
            const option = document.createElement('option');
            option.appendChild(document.createTextNode(`${tag} (${tagsCount[tag]})`));
            option.setAttribute('value', tag);
            tagsSelect.add(option);
        });

    const timestamps = allComments.map(comment => comment.timestamp);
    const secondsInDay = 24 * 60 * 60;
    startDateInput.valueAsDate = new Date(Math.min(...timestamps) * 1000);
    endDateInput.valueAsDate = new Date((Math.max(...timestamps) + secondsInDay) * 1000);

    let pendingUpdate = null;
    let updating = false;

    const debounceUpdate = () => {
        if (pendingUpdate) {
            window.clearTimeout(pendingUpdate);
        }
        pendingUpdate = window.setTimeout(update, 200);
    };

    /**
     * Finds all quoted terms in input, returned as an array, as well as any remaining text.
     * @param {string} input
     * @returns {[string[], string]}
     */
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

    /**
     * @returns {UIState}
     */
    const getCurrentUIState = () => {
        return {
            selectCommentType: typeSelect.value,
            sortBy: sortSelect.value,
            showComments: showSelect.value,
            searchTerms: searchInput.value.trim(),
            category: categorySelect.value,
            selectedTags: Array.from(tagsSelect.selectedOptions).map(option => option.value),
            startDate: startDateInput.value,
            endDate: endDateInput.value,
            pageNumber: parseInt(pageSelect.value, 10)
        };
    };

    const initialParams = getCurrentUIState();

    /**
     * @type {UIState | null}
     */
    let lastState = null;

    const readParamsFromHash = () => {
        console.info('attempt readParamsFromHash');

        const hash = (window.location.hash || '').substring(1); // remove '#'
        const params = new URLSearchParams(hash);
        console.info('start readParamsFromHash', params);

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
        console.info('finish readParamsFromHash');
    };

    const writeParamsToHash = () => {
        if (!hasReadHashParams) {
            console.warn('writeParamsToHash skipped');
        }

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
        console.info('finish writeParamsToHash', params);
    };

    /**
     * Filters and then sorts using the passed-in UI state.
     * @param {Comment[]} comments
     * @param {UIState} state
     * @returns {Comment[]}
     */
    const getFilteredAndSortedComments = (comments, state) => {
        console.log('getFilteredAndSortedComments', comments.length, state);

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesTypeMatch = (comment) => {
            switch (state.selectCommentType) {
                case 'all':
                    return true;
                case 'top':
                    return comment.top_level;
                case 'reply':
                    return !comment.top_level;
            }
        }

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesCategoryMatch = (comment) => state.category === 'all' || comment.category === state.category

        const startTimestamp = state.startDate
            ? new Date(state.startDate).getTime() / 1000
            : null;
        const endTimestamp = state.endDate
            ? new Date(state.endDate).getTime() / 1000
            : null;

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const inTimestampRange = (comment) =>
            (startTimestamp === null || comment.timestamp >= startTimestamp) &&
            (endTimestamp === null || comment.timestamp <= endTimestamp)

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doTagsMatch = (comment) => state.selectedTags.length === 0 || state.selectedTags[0] === 'all' ||
            state.selectedTags.every(tag => comment.tags.includes(tag));

        const [extractedTerms, remainingInput] = extractQuotedRegex(state.searchTerms);
        const terms = remainingInput.length
            ? remainingInput.trim().split(/\s+/).filter(Boolean)
            : [];
        const combinedTerms = extractedTerms.concat(terms);

        const termsRegexes = combinedTerms.map(term => {
            try {
                return new RegExp(term, 'i');
            } catch (e) {
                console.error(`Invalid regex: ${term}`, e);
                return null;
            }
        }).filter(Boolean);

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doTermsMatch = (comment) =>
            termsRegexes.length === 0
                ? true
                : termsRegexes.every(termRegex =>
                    comment.body.some(paragraph =>
                        paragraph.some(span => termRegex.test(span.value))
                    )
                )

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesCommentMatch = (comment) => doesTypeMatch(comment) && doesCategoryMatch(comment) &&
            inTimestampRange(comment) && doTagsMatch(comment) && doTermsMatch(comment);

        /**
         * @param {Comment} a
         * @param {Comment} b
         * @returns {number}
         */
        const compareComments = (a, b) => {
            switch (state.sortBy) {
                case 'likes':
                    return b.likes - a.likes;
                case 'new':
                    return b.timestamp - a.timestamp;
                case 'old':
                    return a.timestamp - b.timestamp;
                case 'ratio_recv':
                    return b.ratio_recv - a.ratio_recv;
                case 'ratio_give':
                    return b.ratio_give - a.ratio_give;
                case 'fk_asc':
                    return a.grade_level - b.grade_level;
                case 'fk_desc':
                    return b.grade_level - a.grade_level;
                case 'reply_count':
                    return b.total_children - a.total_children;
                case 'length':
                    return computeLength(b) - computeLength(a);
                default:
                    throw new Error(`Unknown sort type: ${state.sortBy}`);
            }
        }

        const filteredComments = comments.filter(doesCommentMatch);
        filteredComments.sort(compareComments);
        return filteredComments;
    };

    /**
     * @param {UIState | null} prevState
     * @param {UIState} currentState
     * @returns {boolean}
     */
    const didPagesChange = (prevState, currentState) => {
        if (!prevState) return true; // first time
        return (
            prevState.selectCommentType !== currentState.selectCommentType ||
            prevState.sortBy !== currentState.sortBy ||
            prevState.showComments !== currentState.showComments ||
            prevState.searchTerms !== currentState.searchTerms ||
            prevState.startDate !== currentState.startDate ||
            prevState.endDate !== currentState.endDate ||
            prevState.category !== currentState.category ||
            prevState.selectedTags.join(',') !== currentState.selectedTags.join(',')
        );
    };

    const update = () => {
        if (updating) {
            console.warn('recursive update');
            return;
        }
        console.log('start updating');
        updating = true;
        const startTime = new Date().getTime();

        const currentState = getCurrentUIState();

        const pagesChange = didPagesChange(lastState, currentState);
        const pageNumber = pagesChange ? 1 : currentState.pageNumber;

        lastState = Object.assign({}, currentState, {pageNumber});

        let comments = getFilteredAndSortedComments(allComments, lastState);

        clearChildren(commentCount);
        commentCount.appendChild(document.createTextNode(`${comments.length} matching comments out of ${allComments.length} total`));

        let pages = 1;
        if (lastState.showComments !== 'all') {
            const commentsToShow = parseInt(lastState.showComments, 10);
            pages = Math.ceil(comments.length / commentsToShow);
            const start = (pageNumber - 1) * commentsToShow;
            const end = pageNumber * commentsToShow;
            comments = comments.slice(start, end);
        }

        clearChildren(totalPages);
        totalPages.appendChild(document.createTextNode(`of ${pages}`));

        clearChildren(pageSelect);
        for (let i = 1; i <= pages; i++) {
            const pageOption = document.createElement('option');
            pageOption.appendChild(document.createTextNode(String(i)));
            pageOption.setAttribute('value', String(i));
            pageSelect.add(pageOption);
        }
        pageSelect.selectedIndex = pageNumber - 1;

        clearChildren(commentsDiv);

        const [extractedTerms, remainingInput] = extractQuotedRegex(lastState.searchTerms);
        const terms = remainingInput.length
            ? remainingInput.trim().split(/\s+/).filter(Boolean)
            : [];
        const combinedTerms = extractedTerms.concat(terms);
        const createTermMatcher = () => {
            try {
                return new RegExp(combinedTerms.map(t => `(?:${t})`).join('|'), 'ig');
            } catch (e) {
                console.error('Invalid regex', e);
                return null;
            }
        };
        const termsMatcher = combinedTerms.length > 0 ? createTermMatcher() : null;

        comments.forEach(comment => renderComment(comment, termsMatcher));

        writeParamsToHash();
        const endTime = new Date().getTime();
        console.log(`update took ${endTime - startTime}ms`);
        updating = false;
    };

    /**
     * @param {HTMLElement} node
     */
    const clearChildren = (node) => {
        while (node.firstChild) {
            node.removeChild(node.lastChild);
        }
    };

    /**
     * @param {string} url
     * @param {string | HTMLElement} text
     * @param {string} cssClass
     * @returns {HTMLAnchorElement}
     */
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

    /**
     * Extracts the last two components of a URL's hostname.
     * @param {string} url
     * @returns {string}
     */
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

    /**
     * Renders a single comment to the commentsDiv.
     * @param {Comment} comment
     * @param {RegExp | null} termsMatcher
     */
    const renderComment = (comment, termsMatcher) => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('metaContainer');
        entryDiv.appendChild(metaDiv);

        const createText = (text, cssClass) => {
            if (typeof text !== 'string') {
                throw new Error(`Expected string, got ${typeof text} for ${text}`);
            }
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
        createCommentLink(comment.id, `${comment['top_level'] ? 'top-level' : 'reply'} (${comment['total_children']})`);

        if (!comment['top_level']) {
            createCommentLink(comment['thread_id'], `thread (${comment['thread_children']})`);
            createCommentLink(comment['parent_id'], `parent (${comment['parent_children']})`);
        }

        const tagsDiv = document.createElement('span');
        tagsDiv.classList.add('tags');
        comment['tags'].sort((a, b) => a.localeCompare(b))
            .forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('tag');
                const tagColor = tagColors[tag];
                if (tagColor) {
                    tagSpan.style.backgroundColor = tagColor;
                }
                tagSpan.appendChild(document.createTextNode(tag));
                tagsDiv.appendChild(tagSpan);
            });
        metaDiv.appendChild(tagsDiv);

        const categoryDiv = document.createElement('span');
        categoryDiv.classList.add('category');
        categoryDiv.appendChild(document.createTextNode(`Category: ${comment['category']}`));
        metaDiv.appendChild(categoryDiv);

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);

        comment['body'].forEach(block => commentDiv.appendChild(createBodyBlock(block, termsMatcher)));
        commentsDiv.appendChild(entryDiv);
    };

    /**
     * @param {BodySpan[]} paragraph
     * @param {RegExp | null} termsMatcher
     * @returns {HTMLParagraphElement}
     */
    const createBodyBlock = (paragraph, termsMatcher) => {
        const para = document.createElement('p');
        para.classList.add('comment-text');
        paragraph.forEach(span => {
            switch (span['type']) {
                case 'text':
                    createHighlightedText(para, span['value'], termsMatcher);
                    break;
                case 'url':
                    const textNode = document.createElement('span');
                    const link = createLink(span['value'], textNode, 'link');
                    para.appendChild(link);
                    createHighlightedText(textNode, span['value'], termsMatcher);
            }
        });
        return para;
    };

    /**
     * @param {HTMLElement} parent
     * @param {string} value
     * @param {RegExp | null} termsMatcher
     */
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

    /**
     * @param {Comment} comment
     * @returns {number}
     */
    const computeLength = (comment) => {
        return comment['body'].reduce((acc, paragraph) => {
            return acc + paragraph.reduce((acc, span) => {
                return acc + span['value'].length;
            }, 0);
        }, 0);
    };

    function reset() {
        console.info('attempt reset');
        sortSelect.value = initialParams.sortBy;
        typeSelect.value = initialParams.selectCommentType;
        showSelect.value = initialParams.showComments;
        pageSelect.value = initialParams.pageNumber;
        startDateInput.value = initialParams.startDate;
        endDateInput.value = initialParams.endDate;
        categorySelect.value = initialParams.category;
        searchInput.value = initialParams.searchTerms;

        for (let i = 0; i < tagsSelect.options.length; i++) {
            tagsSelect.options[i].selected = initialParams.selectedTags.includes(tagsSelect.options[i].value);
        }

        update();
        console.info('finish reset');
    }

    [sortSelect, typeSelect, showSelect, pageSelect, startDateInput, endDateInput, categorySelect, tagsSelect].forEach(select => {
        select.addEventListener("change", update);
    });
    searchInput.addEventListener("input", debounceUpdate);

    resetButton.addEventListener('click', reset);

    readParamsFromHash();
    update();
    console.log('finished loadComments')
};

window.addEventListener('DOMContentLoaded', loadComments);