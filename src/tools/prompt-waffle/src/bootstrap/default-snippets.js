// Default snippets configuration for new installations
// These are Pip's example snippets — she's the demo character that ships with BotWaffle.
export const DEFAULT_SNIPPETS = [
  {
    id: 'pip_character',
    text: 'young woman,  short black hair with white streak at left temple, heterochromatic eyes left blue right amber, cream-and-black cropped hoodie, high-waisted joggers, white sneakers with marker doodles, medium triangular black-and-white border collie ears with white inner fur, fluffy black-and-white collie tail',
    tags: ['character', 'Pip'],
    title: 'Pip — Character',
    description: 'Pip\'s core character snippet — her appearance, species traits, and outfit.',
    category: 'Pip - Example',
    version: '1.0'
  },
  {
    id: 'pip_quality',
    text: 'masterpiece, best quality, absurdres, high detail, sharp focus,',
    tags: ['Style', 'Initial Quality'],
    title: 'Quality — masterpiece, best quality, absurdres',
    description: 'Base quality tags for high-detail renders.',
    category: 'Pip - Example',
    version: '1.0'
  },
  {
    id: 'pip_lighting',
    text: 'warm studio lighting, creative workspace, cozy and energetic atmosphere, slight smile, engaged expression',
    tags: ['Lighting', 'mood'],
    title: 'Lighting & Mood — warm studio, cozy atmosphere',
    description: 'Warm studio lighting and mood for Pip\'s workspace scenes.',
    category: 'Pip - Example',
    version: '1.0'
  },
  {
    id: 'pip_activity',
    text: 'sitting at a studio desk covered in sticky notes and concept art,\nleaning forward on elbows, ears perked forward attentively, tail swaying behind chair, holding a stylus, multiple screens displaying character design documents,',
    tags: ['activity'],
    title: 'Activity — studio desk, stylus, concept art',
    description: 'Pip at her studio desk, working on character designs.',
    category: 'Pip - Example',
    version: '1.0'
  }
];
// Function to create default snippets with proper timestamps
export function createDefaultSnippets() {
  const timestamp = Date.now();
  return DEFAULT_SNIPPETS.map((snippet, index) => ({
    ...snippet,
    created: timestamp + index, // Ensure unique timestamps
    modified: timestamp + index,
    id: snippet.id // Use the predefined IDs for consistency
  }));
}
// Track which default snippets have been intentionally deleted by the user
const DELETED_SNIPPETS_FILE = 'snippets/.deleted-default-snippets.json';

async function getDeletedSnippetsList() {
  try {
    const content = await window.electronAPI.readFile(DELETED_SNIPPETS_FILE);
    const deleted = JSON.parse(content);
    return Array.isArray(deleted) ? deleted : [];
  } catch (e) {
    // File doesn't exist yet - no snippets have been deleted
    return [];
  }
}

export async function markSnippetAsDeleted(snippetId) {
  try {
    const deleted = await getDeletedSnippetsList();
    if (!deleted.includes(snippetId)) {
      deleted.push(snippetId);
      await window.electronAPI.writeFile(
        DELETED_SNIPPETS_FILE,
        JSON.stringify(deleted, null, 2)
      );
    }
  } catch (error) {
    console.error('Error marking snippet as deleted:', error);
  }
}

// Function to check if default snippets already exist
export async function checkDefaultSnippetsExist() {
  try {
    const existingSnippets = [];
    const deletedSnippets = await getDeletedSnippetsList();

    for (const snippet of DEFAULT_SNIPPETS) {
      // Skip if this snippet was intentionally deleted by the user
      if (deletedSnippets.includes(snippet.id)) {
        continue;
      }

      const filePath = `snippets/Pip - Example/${snippet.id}.json`;
      try {
        const content = await window.electronAPI.readFile(filePath);
        const parsed = JSON.parse(content);
        if (parsed && parsed.id) {
          existingSnippets.push(snippet.id);
        }
      } catch (e) {
        // File doesn't exist or is invalid
      }
    }
    return existingSnippets;
  } catch (error) {
    console.error('Error checking default snippets:', error);
    return [];
  }
}
// Function to create missing default snippets
export async function createMissingDefaultSnippets() {
  try {
    const existingSnippets = await checkDefaultSnippetsExist();
    const missingSnippets = DEFAULT_SNIPPETS.filter(
      snippet => !existingSnippets.includes(snippet.id)
    );
    if (missingSnippets.length === 0) {
      return;
    }
    const timestamp = Date.now();
    let createdCount = 0;
    for (let i = 0; i < missingSnippets.length; i++) {
      const snippet = missingSnippets[i];
      const snippetData = {
        ...snippet,
        created: timestamp + i,
        modified: timestamp + i
      };
      const filePath = `snippets/Pip - Example/${snippet.id}.json`;
      try {
        await window.electronAPI.writeFile(
          filePath,
          JSON.stringify(snippetData, null, 2)
        );
        createdCount++;
      } catch (error) {
        console.error(`Failed to create default snippet ${snippet.id}:`, error);
      }
    }
    return createdCount;
  } catch (error) {
    console.error('Error creating default snippets:', error);
    return 0;
  }
}
