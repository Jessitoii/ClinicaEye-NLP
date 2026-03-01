import pandas as pd
import pyarrow.parquet as pq
import re
import os
import logging
from typing import Dict, Tuple
from pathlib import Path

# No need for scikit-multilearn since we have a custom method.

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class DataEngine:
    DISEASE_CLASSES = [
        "Cataract", "Conjunctivitis", "Diabetic Retinopathy", 
        "Dry Eye Syndrome", "Glaucoma", "Macular Degeneration", 
        "Retinal Detachment", "Uveitis"
    ]

    ABBREVIATIONS = {
        r"\bdr\b": "diabetic retinopathy",
        r"\bamd\b": "macular degeneration",
        r"\bdes\b": "dry eye syndrome",
        r"\bgc\b": "glaucoma",   # sometimes used
        r"\bpdr\b": "diabetic retinopathy",
        r"\bnpdr\b": "diabetic retinopathy",
        r"\bcataract\w*\b": "cataract",
        r"\bconjunctivitis\w*\b": "conjunctivitis",
        r"\buveitis\w*\b": "uveitis"
    }

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.kaggle_path = os.path.join(data_dir, "Eye Disease Dataset", "eye_disease_ultra_robust_16922_rows.csv")
        self.qa_train_path = os.path.join(data_dir, "Eye QA Dataset", "train", "0000.parquet")
        self.qa_test_path = os.path.join(data_dir, "Eye QA Dataset", "test", "0000.parquet")

    def preprocess_text(self, text: str) -> str:
        """Lowercasing, remove excessive punctuation, expand abbreviations."""
        if not isinstance(text, str):
            return ""
        
        text = text.lower()
        # Remove non-alphanumeric except spaces, hyphens and dots
        text = re.sub(r'[^a-z0-9\s\.\-]', ' ', text)
        
        # Expand abbreviations
        for pattern, replacement in self.ABBREVIATIONS.items():
            text = re.sub(pattern, replacement, text)
            
        # Collapse whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_labels_with_negation(self, text: str) -> Dict[str, int]:
        """
        Uses a sliding window/regex to find diseases and check for preceding negation.
        """
        labels = {cls: 0 for cls in self.DISEASE_CLASSES}
        negation_words = ["no", "not", "without", "denies", "absent", "negative for", "ruled out", "free of"]
        
        # We need to test if words match
        for cls in self.DISEASE_CLASSES:
            cls_lower = cls.lower()
            # Find all occurrences of the class
            for match in re.finditer(r'\b' + re.escape(cls_lower) + r'\b', text):
                # get text before the match (up to 40 characters)
                start_idx = max(0, match.start() - 40)
                prefix = text[start_idx:match.start()]
                
                is_negated = False
                for neg in negation_words:
                    neg_match = re.search(r'\b' + re.escape(neg) + r'\b', prefix)
                    if neg_match:
                        # Ensure there is no sentence boundary `.` or `but` between the negation and the disease
                        between_text = prefix[neg_match.end():]
                        if '.' not in between_text and ' but ' not in between_text:
                            is_negated = True
                            break
                            
                if not is_negated:
                    labels[cls] = 1
                    break # One positive mention is enough
                    
        return labels

    def load_kaggle_data(self) -> pd.DataFrame:
        logging.info("Loading Kaggle Dataset...")
        df = pd.read_csv(self.kaggle_path)
        df.rename(columns={"symptom_text": "text"}, inplace=True)
        df["source"] = "Kaggle"
        # Preprocess text (clean text, labels remain as is)
        df["text"] = df["text"].apply(self.preprocess_text)
        return df

    def load_qa_data(self) -> pd.DataFrame:
        logging.info("Loading Eye-QA Dataset...")
        df_train = pq.read_table(self.qa_train_path).to_pandas()
        df_test = pq.read_table(self.qa_test_path).to_pandas()
        df = pd.concat([df_train, df_test], ignore_index=True)
        
        # STRICT DATA LEAKAGE PREVENTION: input + instruction -> text. Output used strictly for labeling.
        df["text"] = df["instruction"].fillna("") + " " + df["input"].fillna("")
        df["text"] = df["text"].apply(self.preprocess_text)
        
        # Harmonize labels based on output
        logging.info("Harmonizing labels for Eye-QA Dataset using negation checks...")
        df_output = df["output"].fillna("").apply(self.preprocess_text)
        extracted_labels = df_output.apply(self.extract_labels_with_negation)
        label_df = pd.DataFrame(extracted_labels.tolist())
        
        # Combine
        df = pd.concat([df[["text"]], label_df], axis=1)
        df["source"] = "Eye-QA"
        
        return df

    def prepare_data(self) -> pd.DataFrame:
        df_kaggle = self.load_kaggle_data()
        df_qa = self.load_qa_data()
        
        df_merged = pd.concat([df_kaggle, df_qa], ignore_index=True)
        
        # Filter unlabelled QA entries or keep them? For now, let's keep only labeled samples
        has_label = df_merged[self.DISEASE_CLASSES].sum(axis=1) > 0
        df_labeled = df_merged[has_label].copy()
        
        logging.info(f"Merged & Labeled Dataset Size: {len(df_labeled)} (Filtered out {(len(df_merged) - len(df_labeled))} unlabeled)")
        return df_labeled

    def stratified_split(self, df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
        logging.info("Performing Stratified Split across 8 labels using custom rare-dominant heuristic...")
        if len(df) == 0:
            return pd.DataFrame(), pd.DataFrame()

        # Custom Heuristic Stratification:
        # Define label rarity to assign a dominant class to each multi-label sample.
        label_counts = df[self.DISEASE_CLASSES].sum()
        # Sort classes from rarest to most common
        rarest_first = label_counts.sort_values().index.tolist()

        # Assign dominant class
        def get_dominant(row):
            for cls in rarest_first:
                if row[cls] > 0:
                    return cls
            return "None"
            
        df["_dominant_class"] = df.apply(get_dominant, axis=1)
        
        # Now we can just do a random split per dominant class
        train_dfs = []
        test_dfs = []
        
        for cls, group in df.groupby("_dominant_class"):
            # Shuffle group
            group = group.sample(frac=1.0, random_state=42)
            n_test = max(1, int(len(group) * test_size))
            if len(group) == 1:
                train_dfs.append(group)
            else:
                test_dfs.append(group.iloc[:n_test])
                train_dfs.append(group.iloc[n_test:])
                
        train_df = pd.concat(train_dfs).drop(columns=["_dominant_class"])
        test_df = pd.concat(test_dfs).drop(columns=["_dominant_class"])
        df.drop(columns=["_dominant_class"], inplace=True)
            
        logging.info(f"Train Size: {len(train_df)} | Test Size: {len(test_df)}")
        return train_df, test_df

    def generate_balance_report(self, df: pd.DataFrame, train_df: pd.DataFrame, test_df: pd.DataFrame) -> Dict:
        report = {
            "Total Samples": len(df),
            "Train Samples": len(train_df),
            "Test Samples": len(test_df),
            "Overall Class Distribution": df[self.DISEASE_CLASSES].sum().to_dict(),
        }
        if len(train_df) > 0:
            report["Train Class Distribution"] = train_df[self.DISEASE_CLASSES].sum().to_dict()
            report["Test Class Distribution"] = test_df[self.DISEASE_CLASSES].sum().to_dict()
        else:
            report["Train Class Distribution"] = {}
            report["Test Class Distribution"] = {}

        # Conflicts / Extraneous data
        multi_label_count = (df[self.DISEASE_CLASSES].sum(axis=1) > 1).sum()
        report["Multi-label Samples"] = int(multi_label_count)
        
        missing_text = (df["text"].str.strip() == "").sum()
        report["Missing Text Samples"] = int(missing_text)
        
        return report

    def export_report(self, report: Dict, filepath: str = "data_report.md"):
        logging.info(f"Exporting Dataset Report to {filepath}")
        with open(filepath, "w") as f:
            f.write("# ClinicaEye-NLP Data Report\n\n")
            f.write("## Overview\n")
            f.write(f"- **Total Labeled Samples:** {report['Total Samples']}\n")
            f.write(f"- **Train Samples:** {report['Train Samples']}\n")
            f.write(f"- **Test Samples:** {report['Test Samples']}\n")
            f.write(f"- **Multi-label Samples:** {report['Multi-label Samples']} (Samples mapped to >1 disease)\n")
            f.write(f"- **Missing Text Samples:** {report['Missing Text Samples']}\n\n")
            
            f.write("## Overall Class Distribution\n")
            for cls, count in report['Overall Class Distribution'].items():
                f.write(f"- **{cls}:** {count}\n")
                
            f.write("\n## Train/Test Class Balance\n")
            f.write("| Disease | Train Count | Test Count | Test % |\n")
            f.write("|---------|-------------|------------|--------|\n")
            for cls in self.DISEASE_CLASSES:
                train_c = report['Train Class Distribution'].get(cls, 0)
                test_c = report['Test Class Distribution'].get(cls, 0)
                total_c = train_c + test_c
                pct = round(test_c / total_c * 100, 1) if total_c > 0 else 0
                f.write(f"| {cls} | {train_c} | {test_c} | {pct}% |\n")
                
            f.write("\n## Harmonization Notes\n")
            f.write("- **Data Leakage Prevented**: The Eye-QA dataset extraction strictly used the `instruction` and `input` columns for the input features, reserving `output` *only* for label extraction.\n")
            f.write("- **Negation Handling**: Labels were harmonized utilizing a sliding window regex parser with negation heuristics over the target classes to handle phrases like 'no signs of cataract'.\n")
            f.write("- **Stratification**: Cross-label iteration via a rare-dominant heuristic to appropriately split multi-labeled distributions without external dependencies.\n")

if __name__ == "__main__":
    current_dir = Path(__file__).parent
    project_root = current_dir.parent.parent
    data_dir = project_root / "Data"
    
    engine = DataEngine(data_dir=str(data_dir))
    df = engine.prepare_data()
    train_df, test_df = engine.stratified_split(df, test_size=0.2)
    report = engine.generate_balance_report(df, train_df, test_df)
    
    report_path = project_root / "data_report.md"
    engine.export_report(report, filepath=str(report_path))
    
    # Also save the final dfs as parquet for fast loading later
    output_dir = project_root / "Data" / "Processed"
    output_dir.mkdir(exist_ok=True)
    
    train_df.to_parquet(output_dir / "train.parquet", index=False)
    test_df.to_parquet(output_dir / "test.parquet", index=False)
    
    logging.info("Data Engine processing finished successfully.")
