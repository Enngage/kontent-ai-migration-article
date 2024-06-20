import {
  MigrationAsset,
  MigrationElementModels,
  MigrationElements,
  MigrationItem,
  elementsBuilder,
  importAsync,
  storeAsync,
} from "@kontent-ai-consulting/migration-toolkit";
import { readFileSync } from "fs";

/**
 * Optionally (but strongly recommended) you may define a migration model
 * representing the content type you are trying to migrate into
 */
interface MovieElements extends MigrationElements {
  title: MigrationElementModels.TextElement;
  plot: MigrationElementModels.RichTextElement;
  length: MigrationElementModels.NumberElement;
  category: MigrationElementModels.MultipleChoiceElement;
  poster: MigrationElementModels.AssetElement;
}

interface SourceItemModel {
  title: string;
  language: string;
  genre: string;
  text: string;
  duration: number;
}

function toCodename(text: string): string {
  // Regular expression to match alphanumeric characters and underscores
  const regex = /[^a-zA-Z0-9_]/g;
  // Replace any character that doesn't match the regex with an empty string
  return text.replace(regex, "").toLowerCase();
}

function translateLanguageCodename(language: string): string {
  if (language === "english") {
    return "en";
  }
  throw Error(`Invalid language '${language}'`);
}

const fileData = readFileSync("./source-data.json").toString();
const migrationItems: MigrationItem[] = [];

for (const item of JSON.parse(fileData) as SourceItemModel[]) {
  const movie: MigrationItem<MovieElements> = {
    system: {
      name: item.title,
      codename: toCodename(item.title),
      collection: {
        codename: "default",
      },
      language: {
        codename: translateLanguageCodename(item.language),
      },
      type: {
        codename: "movie",
      },
      workflow: {
        codename: "default",
      },
      workflow_step: {
        codename: "draft",
      },
    },
    elements: {
      title: elementsBuilder().textElement({ value: item.title }),
      length: elementsBuilder().numberElement({ value: item.duration }),
      category: elementsBuilder().multipleChoiceElement({
        value: item.genre.split(",").map((m) => {
          return { codename: m.trim() };
        }),
      }),
      poster: elementsBuilder().assetElement({
        value: [
          {
            codename: "warrior_teaser",
          },
        ],
      }),
      plot: elementsBuilder().richTextElement({
        value: {
          value: `<h1>${item.title}</h1><p>${item.text}</p>`,
          components: [],
        },
      }),
    },
  };

  migrationItems.push(movie);
}

const migrationAssets: MigrationAsset[] = [
  {
    _zipFilename: "warrior_teaser.jpg",
    codename: "warrior_teaser",
    filename: "warrior_teaser.jpg",
    title: "Warrior teaser",
    binaryData: readFileSync("./warrior_teaser.jpg"),
  },
];

// stores data on FS for later use
await storeAsync({
  data: { assets: migrationAssets, items: migrationItems },
  filename: `data.zip`,
});

// and import to Kontent.ai
await importAsync({
  data: { assets: migrationAssets, items: migrationItems },
  environmentId: "91990386-ce1d-0129-beb7-9aa24657820f",
  apiKey: "",
  skipFailedItems: false,
});
