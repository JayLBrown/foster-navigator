import data from "../corpus/rules.json";
import type { Rule } from "./gate";

export const RULES = data.rules as Rule[];
export const CORPUS_META = {
  effective_date: data.effective_date,
  publisher: data.publisher,
  source_document: data.source_document,
  section_count: data.rules.length,
};
