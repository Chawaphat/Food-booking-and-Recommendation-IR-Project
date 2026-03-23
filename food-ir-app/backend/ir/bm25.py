import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

class BM25:
    def __init__(self, b=0.75, k1=1.6):
        self.b = b
        self.k1 = k1
        self.vectorizer = CountVectorizer()
        self.doc_matrix = None
        self.doc_len = None
        self.avgdl = None
        self.idf = None

    def fit(self, documents):
        self.doc_matrix = self.vectorizer.fit_transform(documents)

        self.doc_len = self.doc_matrix.sum(axis=1).A1
        self.avgdl = np.mean(self.doc_len)

        df = np.bincount(self.doc_matrix.indices, minlength=self.doc_matrix.shape[1])
        N = self.doc_matrix.shape[0]

        self.idf = np.log((N - df + 0.5) / (df + 0.5) + 1)

    def search(self, query):
        query_vec = self.vectorizer.transform([query])
        query_terms = query_vec.indices

        scores = np.zeros(self.doc_matrix.shape[0])

        for t in query_terms:
            tf = self.doc_matrix[:, t].toarray().flatten()

            numerator = tf * (self.k1 + 1)
            denominator = tf + self.k1 * (1 - self.b + self.b * self.doc_len / self.avgdl)

            scores += self.idf[t] * (numerator / denominator)

        return scores