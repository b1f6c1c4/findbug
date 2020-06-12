#include "homo_set.hpp"

template<>
homo_set<true> &homo_set<true>::operator+=(const elem &el) {
    if (!(*this <= el)) {
        std::erase_if(*this, [&el](const elem &e) {
            return e >= el;
        });
        insert(el);
    }
    return *this;
}

template<>
homo_set<false> &homo_set<false>::operator+=(const elem &el) {
    if (!(*this >= el)) {
        std::erase_if(*this, [&el](const elem &e) {
            return e <= el;
        });
        insert(el);
    }
    return *this;
}
