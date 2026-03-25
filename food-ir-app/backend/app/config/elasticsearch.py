import os
from elasticsearch import Elasticsearch

ES_HOST = os.environ.get("ES_HOST", "https://localhost:9200")
ES_USER = os.environ.get("ES_USER", "elastic")
ES_PASSWORD = os.environ.get("ES_PASSWORD", "NBkWry_P6PnKWhqdKuNV")

def get_es_client():
    es = Elasticsearch(
        ES_HOST,
        basic_auth=(ES_USER, ES_PASSWORD),
        verify_certs=False
    )
    return es
