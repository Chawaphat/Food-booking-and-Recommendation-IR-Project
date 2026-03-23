import re
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

stop_dict = set(stopwords.words('english'))
ps = PorterStemmer()

def clean_list_field(text):
    if not isinstance(text, str):
        return ""

    text = re.sub(r'^c\(|\)$', '', text)
    text = text.replace('"', '')
    text = text.replace(',', ' ')

    return text


def preprocess(text):
    text = re.sub(r'[^A-Za-z]', ' ', str(text))
    text = text.lower()

    tokens = word_tokenize(text)
    tokens = [t for t in tokens if t not in stop_dict and len(t) > 2]
    tokens = [ps.stem(t) for t in tokens]

    return " ".join(tokens)