/**
 * Utility to handle Whop's TipTap/JSON content format.
 */

export function extractPlainText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') {
        // If it starts with {, it might be JSON string
        if (content.trim().startsWith('{')) {
            try {
                return extractPlainText(JSON.parse(content));
            } catch (e) {
                return content;
            }
        }
        return content;
    }

    // Handle TipTap JSON structure
    if (content.type === 'doc' && Array.isArray(content.content)) {
        return content.content.map(extractPlainText).join(' ').trim();
    }

    if (content.type === 'paragraph' && Array.isArray(content.content)) {
        return content.content.map(extractPlainText).join('').trim();
    }

    if (content.type === 'text' && content.text) {
        return content.text;
    }

    // Recursive search for other node types
    if (Array.isArray(content.content)) {
        return content.content.map(extractPlainText).join(' ').trim();
    }

    return '';
}

/**
 * Scans TipTap JSON for specific URLs (YouTube, Loom, PDFs)
 */
export function extractLinksFromContent(content: any): string[] {
    const jsonStr = typeof content === 'object' ? JSON.stringify(content) : String(content);

    // v6.4 EXPANDED REGEX: Handles /embed/, /shorts/, /v/, etc.
    const urlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/|loom\.com\/share\/|[^\s"'<>]+?\.pdf)[^\s"'<>]+/gi;
    const matches = jsonStr.match(urlRegex) || [];

    // Also look specifically for TipTap link marks
    const specificLinks: string[] = [];

    const traverse = (node: any) => {
        if (!node || typeof node !== 'object') return;

        if (node.marks && Array.isArray(node.marks)) {
            for (const mark of node.marks) {
                if (mark.type === 'link' && mark.attrs?.href) {
                    specificLinks.push(mark.attrs.href);
                }
            }
        }

        if (Array.isArray(node.content)) {
            node.content.forEach(traverse);
        }
    };

    try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        traverse(parsed);
    } catch (e) { }

    return Array.from(new Set([...matches, ...specificLinks]));
}

/**
 * Recursively scans an object for media links (YouTube, Loom, PDF)
 */
export function deepSearchUrls(obj: any): string[] {
    const urls: string[] = [];
    // v6.4 EXPANDED REGEX: Consistent across all search tools
    const urlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/|loom\.com\/share\/|[^\s"'<>]+?\.pdf)[^\s"'<>]+/gi;

    const scan = (item: any) => {
        if (!item) return;

        if (typeof item === 'string') {
            const matches = item.match(urlRegex);
            if (matches) urls.push(...matches);

            // If it's a JSON string, try to parse and scan it
            if (item.trim().startsWith('{')) {
                try { scan(JSON.parse(item)); } catch (e) { }
            }
        } else if (Array.isArray(item)) {
            item.forEach(scan);
        } else if (typeof item === 'object') {
            Object.values(item).forEach(scan);
        }
    };

    scan(obj);
    return Array.from(new Set(urls));
}
