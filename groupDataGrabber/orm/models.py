from sqlalchemy import BigInteger, create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func

from orm.configs import DB_URI

eng = create_engine (DB_URI)
Base = declarative_base ()

Session = sessionmaker(bind=eng)
session = Session()

class Group(Base):
    __tablename__ = 'users_groups'
    id = Column(BigInteger, primary_key=True, autoincrement=False)
    name = Column(String(80))
    owner_id = Column(String(255))
    owner_username = Column(String(255))
    is_active = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now())


class User(Base):
    __tablename__ = 'active_users'
    id = Column(BigInteger, primary_key=True, autoincrement=False)
    group_id = Column(BigInteger, nullable=False)
    username = Column(String(30))
    first_name = Column(String(30))
    last_name = Column(String(30))
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now())
    is_bot = Column(Boolean, default=False, nullable=False)


def createTables():
    Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)
