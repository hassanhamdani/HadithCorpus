# HadithCorpus

`HadithCorpus` is a unified repository for public hadith corpus files drawn from the Sunni and Shia collections prepared for release.

## Contents

- `index.html`: lightweight browser viewer for selecting a collection and reading a hadith entry.
- `corpus/shia/v1/collections/`: collection-level metadata for the Shia corpus.
- `corpus/shia/v1/sections/`: section and chapter records in JSONL format.
- `corpus/shia/v1/hadiths/`: hadith records in JSONL format.
- `corpus/sunni/v1/collections/`: collection-level metadata for the Sunni corpus.
- `corpus/sunni/v1/sections/`: section and chapter records in JSONL format.
- `corpus/sunni/v1/hadiths/`: hadith records in JSONL format.
- `metadata/summary.json`: collection counts and aggregate totals for the repository.

## Coverage

This repository currently includes 11 collections, 18,345 section records, and 60,143 hadith records.

### Shia

- Al-Kafi
- Man La Yahduruhu al-Faqih
- Nahj al-Balagha

### Sunni

- Jami' al-Tirmidhi
- Musnad Ahmad ibn Hanbal
- Muwatta Malik
- Sahih al-Bukhari
- Sahih Muslim
- Sunan Abi Dawud
- Sunan al-Nasa'i
- Sunan Ibn Majah

## Formats

- Collection files are stored as `.json`.
- Section files are stored as `.jsonl`.
- Hadith files are stored as `.jsonl`.
