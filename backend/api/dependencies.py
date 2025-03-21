from repository.sqllite import SQLLiteRepository


def get_db():
    db = SQLLiteRepository()
    try:
        yield db
    finally:
        db.close()